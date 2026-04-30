import asyncio, httpx, time
from backend.config import settings

LANG_MAP = {
    "en": "English", "eng": "English", "english": "English",
    "ne": "Nepali",  "nep": "Nepali",  "nepali": "Nepali",
    "tmg": "Tamang", "tamang": "Tamang",
}

def normalize_lang(lang: str) -> str:
    return LANG_MAP.get(lang.lower().strip(), lang)

class RateLimitedTranslator:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._last_call = 0
        self._min_interval = 60 / settings.rate_limit_rpm  # ~1.09s

    async def translate(self, text: str, src: str, tgt: str) -> str:
        if not text.strip():
            return text
        async with self._lock:
            now = time.monotonic()
            wait = self._min_interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = time.monotonic()

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        settings.tmt_api_url,
                        json={"text": text, "src_lang": normalize_lang(src),
                              "tgt_lang": normalize_lang(tgt)},
                        headers={"Authorization": f"Bearer {settings.tmt_token}",
                                 "Content-Type": "application/json"}
                    )
                data = resp.json()
                if data.get("message_type") == "SUCCESS":
                    return data["output"]
            except Exception:
                if attempt == 2:
                    return text  # fallback: original on failure
                await asyncio.sleep(2 ** attempt)
        return text

translator = RateLimitedTranslator()  # singleton, shared across all requests