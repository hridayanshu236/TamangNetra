"""Translation service for text translation."""
import httpx
import logging
import json
import threading
from pathlib import Path
from fastapi import Depends
from app.models.schemas import TranslationRequest, TranslationResponse
from app.core.config import Settings
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Persistent Knowledge Graph ────────────────────────────────────────────────
# Keyed by "normalized_text|||source_lang|||target_lang".
# Loaded from disk on startup and saved after every new translation.
# Survives server restarts — previously translated sentences cost 0 API calls.

_KG_PATH = Path(__file__).parent.parent.parent / "knowledge_graph_cache.json"
_kg_lock = threading.Lock()
_knowledge_graph: dict[str, str] = {}


def _load_knowledge_graph() -> None:
    """Load the persisted Knowledge Graph from disk into memory."""
    global _knowledge_graph
    # Try multiple paths for reliability in different environments
    paths = [_KG_PATH, Path("/tmp/knowledge_graph_cache.json")]
    
    for p in paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    _knowledge_graph.update(data)
                logger.info(
                    f"Knowledge Graph loaded from {p}: {len(_knowledge_graph)} cached entries."
                )
                return
            except Exception as e:
                logger.warning(f"Could not load Knowledge Graph from {p}: {e}")
    
    logger.info("No Knowledge Graph cache found on disk. Starting fresh.")


def _save_knowledge_graph() -> None:
    """Persist the Knowledge Graph to disk (thread-safe)."""
    with _kg_lock:
        # Save to both locations just in case
        paths = [_KG_PATH, Path("/tmp/knowledge_graph_cache.json")]
        for p in paths:
            try:
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(_knowledge_graph, f, ensure_ascii=False, indent=2)
            except Exception as e:
                logger.warning(f"Could not save Knowledge Graph to {p}: {e}")


def _kg_key(text: str, src: str, tgt: str) -> str:
    return f"{text}|||{src}|||{tgt}"


# Load on module import (i.e., server startup)
_load_knowledge_graph()


class TranslationService:
    """Service for translation operations."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.api_base = settings.tmt_api_base_url
        self.api_token = settings.tmt_api_token

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        """Translate text using TMT API."""
        import asyncio

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "text": request.text,
            "src_lang": request.source_language,
            "tgt_lang": request.target_language,
        }

        max_retries = 5
        import random

        async with httpx.AsyncClient() as client:
            for attempt in range(max_retries):
                try:
                    response = await client.post(
                        self.api_base,
                        json=payload,
                        headers=headers,
                        timeout=30.0
                    )

                    if response.status_code == 429 or response.status_code >= 500:
                        if attempt < max_retries - 1:
                            # Faster backoff for early retries to beat the 300s clock
                            retry_after = response.headers.get("Retry-After")
                            if retry_after and retry_after.isdigit():
                                wait = min(float(retry_after), 10.0) # Cap at 10s
                            else:
                                base_wait = 1.5 ** attempt # Slightly faster than 2.0
                                jitter = random.uniform(0.5, 2.0)
                                wait = base_wait + jitter
                                
                            logger.warning(
                                f"API returned {response.status_code}. Waiting {wait:.2f}s "
                                f"before retry {attempt + 1}/{max_retries - 1}..."
                            )
                            await asyncio.sleep(wait)
                            continue
                        
                        if response.status_code == 429:
                            raise ValueError("TMT API rate limit exceeded after all retries.")
                        else:
                            raise ValueError(f"TMT API returned {response.status_code}: {response.text}")

                    response.raise_for_status()
                    data = response.json()

                    if data.get("message_type") == "FAIL":
                        raise ValueError(data.get("message", "TMT translation failed"))


                    translated_text = data.get("output") or request.text
                    return TranslationResponse(
                        translated_text=translated_text,
                        source_language=request.source_language,
                        target_language=request.target_language,
                        confidence_score=data.get("confidence_score"),
                    )
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code == 429:
                        if attempt < max_retries - 1:
                            logger.warning(
                                f"Rate limited (429). Waiting {RATE_LIMIT_WAIT}s "
                                f"before retry {attempt + 1}/{max_retries - 1}..."
                            )
                            await asyncio.sleep(RATE_LIMIT_WAIT)
                            continue
                        raise ValueError("TMT API rate limit exceeded after all retries.")
                    raise ValueError(
                        f"TMT API returned {exc.response.status_code}: {exc.response.text}"
                    )
                except httpx.HTTPError as exc:
                    if attempt < max_retries - 1:
                        wait = 2.0 ** attempt
                        logger.warning(f"Network error: {exc}. Retrying in {wait}s...")
                        await asyncio.sleep(wait)
                        continue
                    raise ValueError(f"TMT API request failed: {str(exc)}")

    async def batch_translate(
        self,
        texts: list[str],
        source_language: str,
        target_language: str,
        translate_all: bool = False,
        progress_callback=None,
        cache_only: bool = False
    ) -> list[str]:
        """Translate multiple texts concurrently using asyncio.gather.

        Phase 1: Resolve from cache / skip non-translatable (instant).
        Phase 2: Fire all remaining texts concurrently (max 20 at a time).
        
        cache_only: If True, will NOT hit the TMT API. Will return original if not in KG.
        """
        import asyncio
        import re

        def _is_translatable(t: str) -> bool:
            s = t.strip()
            if not s:
                return False
            # Basic pure numbers/dates only (exclude if they have any letters)
            if re.fullmatch(r"[\d,.\s\-+%$€£¥₹₨()x:]+", s): 
                # If it has meaningful labels like "Credit Hours", we should translate
                if any(c.isalpha() for c in s): return True
                return False
            
            if len(s) <= 1: return False
            # Dates like 2020-08-24
            if re.fullmatch(r"\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}", s): return False
            # Emails
            if re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", s): return False
            # URLs
            if re.search(r"https?://\S+|www\.\S+", s): return False
            
            # Heuristic: If it has very few letters relative to its length, it's likely a technical string
            # count both English and Devanagari letters
            letters = len(re.findall(r'[a-zA-Z\u0900-\u097F]', s))
            if len(s) > 10 and letters / len(s) < 0.2:
                return False

            return True

        total = len(texts)
        results: list[str | None] = [None] * total
        completed = 0
        cache_hits = 0
        api_calls = 0
        skipped = 0

        # ── Phase 1: Resolve from cache / non-translatable ────────────────────
        uncached_indices: list[int] = []
        for i, text in enumerate(texts):
            if not text.strip():
                results[i] = ""
                skipped += 1
            else:
                normalized = text.strip()
                if not translate_all and not _is_translatable(normalized):
                    results[i] = text
                    skipped += 1
                else:
                    cache_key = _kg_key(normalized, source_language, target_language)
                    if cache_key in _knowledge_graph:
                        results[i] = _knowledge_graph[cache_key]
                        cache_hits += 1
                    else:
                        uncached_indices.append(i)

        # Report progress for cache-hit phase
        completed = total - len(uncached_indices)
        if progress_callback and total > 0:
            await progress_callback(completed, total)

        # DIAGNOSTIC: log what texts missed the cache so we can identify mismatches
        if uncached_indices:
            misses = [repr(texts[i][:80]) for i in uncached_indices[:5]]
            logger.info(f"Cache misses ({len(uncached_indices)}/{total}): {misses}")

        # ── Phase 2: Translate uncached texts concurrently ────────────────────
        # Reduced concurrency to 3 to avoid 429 rate limits
        MAX_CONCURRENT = 3
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        lock = asyncio.Lock()

        async def translate_one(idx: int) -> None:
            nonlocal completed, api_calls
            text = texts[idx]
            normalized = text.strip()
            cache_key = _kg_key(normalized, source_language, target_language)

            async with semaphore:
                try:
                    # Check memory cache first (ultra-fast)
                    if cache_key in _knowledge_graph:
                        translated = _knowledge_graph[cache_key]
                        results[idx] = translated
                        async with lock:
                            completed += 1
                            if progress_callback:
                                await progress_callback(completed, total, {"original": text, "translated": translated})
                        return

                    request = TranslationRequest(
                        text=text,
                        source_language=source_language,
                        target_language=target_language
                    )
                    response = await self.translate(request)
                    translated = response.translated_text

                    async with lock:
                        _knowledge_graph[cache_key] = translated
                        api_calls += 1
                    results[idx] = translated
                    
                    async with lock:
                        completed += 1
                        if progress_callback:
                            await progress_callback(completed, total, {"original": text, "translated": translated})
                except Exception as e:
                    logger.warning(f"Translation failed for '{text[:50]}': {e}")
                    results[idx] = text  # Fallback to original
                    async with lock:
                        completed += 1
                        if progress_callback:
                            await progress_callback(completed, total, {"original": text, "translated": text})

        if uncached_indices and not cache_only:
            await asyncio.gather(*(translate_one(i) for i in uncached_indices))
            # Save once at the end of the batch for efficiency
            _save_knowledge_graph()
        elif uncached_indices:
            # If cache_only and we have misses, just populate results with originals
            for idx in uncached_indices:
                results[idx] = texts[idx]

        logger.info(
            f"batch_translate complete: {api_calls} API calls, "
            f"{cache_hits} KG cache hits, "
            f"{skipped} non-translatable items skipped "
            f"({len(_knowledge_graph)} total entries cached)"
        )
        return [r if r is not None else texts[i] for i, r in enumerate(results)]


def get_translation_service(settings: Settings = Depends(get_settings)) -> TranslationService:
    """Factory function to create translation service."""
    return TranslationService(settings)
