from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, List
import io
import logging

from app.services.translation import get_translation_service, TranslationService
from app.services.document import get_document_processor, DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/document", tags=["Document Processing"])

def get_processor(translation_service: TranslationService = Depends(get_translation_service)) -> DocumentProcessor:
    return get_document_processor(translation_service)

@router.post("/process")
async def process_document(
    file: UploadFile = File(...),
    src_lang: str = Form(...),
    tgt_lang: str = Form(...),
    processor: DocumentProcessor = Depends(get_processor)
) -> StreamingResponse:
    """
    Process a document (PDF, DOCX, CSV, Excel, Image), extract text, apply OCR if needed,
    and translate the extracted text. Now streams NDJSON progress.
    """
    import asyncio
    import json
    
    if src_lang == tgt_lang:
        raise HTTPException(status_code=400, detail="Source and target languages must be different")
        
    file_content = await file.read()
    file_name = file.filename
    file_size = file.size
    
    queue = asyncio.Queue()
    
    async def progress_callback(current, total):
        await queue.put({"type": "progress", "current": current, "total": total})
        
    async def run_process():
        try:
            await queue.put({"type": "status", "message": "Extracting text..."})
            result = await processor.process_file(file_content, file_name, file_size, src_lang, tgt_lang, progress_callback)
            await queue.put({"type": "result", "data": result})
        except ValueError as e:
            await queue.put({"type": "error", "message": str(e)})
        except Exception as e:
            logger.error(f"Error in process_document: {e}")
            await queue.put({"type": "error", "message": f"Internal server error: {str(e)}"})
            
    async def stream():
        task = asyncio.create_task(run_process())
        while True:
            msg = await queue.get()
            yield json.dumps(msg) + "\n"
            if msg["type"] in ("result", "error"):
                break
                
    return StreamingResponse(stream(), media_type="application/x-ndjson")

@router.post("/reconstruct")
async def reconstruct_document(
    file: UploadFile = File(...),
    src_lang: str = Form(...),
    tgt_lang: str = Form(...),
    processor: DocumentProcessor = Depends(get_processor)
) -> StreamingResponse:
    """
    Reconstruct the uploaded document with exact layout/formatting
    but with translated text.
    """
    if src_lang == tgt_lang:
        raise HTTPException(status_code=400, detail="Source and target languages must be different")
        
    try:
        content_bytes, content_type = await processor.reconstruct_file(file, src_lang, tgt_lang)
        
        # Determine download filename
        base_name = file.filename.rsplit('.', 1)[0] if '.' in file.filename else file.filename
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
        download_name = f"translated_{base_name}.{ext}"
        
        return StreamingResponse(
            io.BytesIO(content_bytes),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{download_name}"',
                "Content-Length": str(len(content_bytes))
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in reconstruct_document: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



# Module-level font cache so we only download once per server lifetime
_font_cache: dict[str, bytes] = {}


def _get_font_bytes(url: str) -> bytes:
    """Download and cache a font file by URL."""
    if url not in _font_cache:
        import requests as req
        logger.info(f"Downloading font from {url}...")
        r = req.get(url, timeout=20)
        r.raise_for_status()
        _font_cache[url] = r.content
        logger.info("Font downloaded and cached.")
    return _font_cache[url]


from pydantic import BaseModel

class PdfSegment(BaseModel):
    original: str
    translated: str

class GeneratePdfRequest(BaseModel):
    segments: List[PdfSegment]
    src_lang: str
    tgt_lang: str
    file_name: str = "document"


@router.post("/generate-pdf")
async def generate_pdf(body: GeneratePdfRequest):
    """
    Generate a Unicode-correct PDF from translated segments using PyMuPDF.
    Uses the Noto Sans Devanagari font for Nepali/Tamang script rendering.
    """
    try:
        import fitz  # PyMuPDF

        PAGE_WIDTH = 595
        PAGE_HEIGHT = 842
        MARGIN = 50
        LINE_HEIGHT = 20
        FONT_SIZE = 11

        # --- Load font ---
        is_devanagari = body.tgt_lang.lower() in ("nepali", "ne", "tamang", "tam")
        font_bytes: bytes | None = None

        if is_devanagari:
            try:
                font_bytes = _get_font_bytes(
                    "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/"
                    "NotoSansDevanagari/NotoSansDevanagari-Regular.ttf"
                )
            except Exception as fe:
                logger.warning(f"Could not load Devanagari font: {fe}. Falling back to built-in.")

        def make_font() -> fitz.Font:
            if font_bytes:
                return fitz.Font(fontbuffer=font_bytes)
            return fitz.Font("helv")

        doc = fitz.open()
        font = make_font()

        def add_page():
            p = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
            return p, PAGE_HEIGHT - MARGIN

        def wrap_lines(text: str) -> list[str]:
            """Word-wrap text using real font metrics."""
            max_w = PAGE_WIDTH - 2 * MARGIN
            words = text.split()
            lines: list[str] = []
            current = ""
            for word in words:
                candidate = (current + " " + word).strip()
                try:
                    w = font.text_length(candidate, fontsize=FONT_SIZE)
                except Exception:
                    w = len(candidate) * FONT_SIZE * 0.55  # rough fallback
                if w > max_w and current:
                    lines.append(current)
                    current = word
                else:
                    current = candidate
            if current:
                lines.append(current)
            return lines or [""]

        def draw_paragraph(page, y: float, text: str, size: int, color: tuple):
            """Draw a wrapped paragraph. Returns (page, y) — may add new pages."""
            if not text.strip():
                return page, y - LINE_HEIGHT

            for line in wrap_lines(text):
                if y < MARGIN + LINE_HEIGHT:
                    page, y = add_page()

                try:
                    tw = fitz.TextWriter(page.rect)
                    tw.append(fitz.Point(MARGIN, y), line, font=font, fontsize=size)
                    tw.write_text(page, color=color)
                except Exception as e:
                    logger.warning(f"TextWriter failed for line, using fallback: {e}")
                    # Fallback: insert_text with built-in font (Latin only)
                    safe_line = line.encode("ascii", errors="replace").decode("ascii")
                    page.insert_text(fitz.Point(MARGIN, y), safe_line, fontsize=size, color=color)

                y -= LINE_HEIGHT

            return page, y

        # ── Translated text pages ──────────────────────────────────────────
        page, y = add_page()

        title = f"Translated: {body.src_lang} -> {body.tgt_lang}"
        try:
            tw = fitz.TextWriter(page.rect)
            tw.append(fitz.Point(MARGIN, y), title, font=font, fontsize=14)
            tw.write_text(page, color=(0.1, 0.5, 0.4))
        except Exception:
            page.insert_text(fitz.Point(MARGIN, y), title, fontsize=14, color=(0.1, 0.5, 0.4))
        y -= 30

        for seg in body.segments:
            if not seg.translated.strip():
                continue
            page, y = draw_paragraph(page, y, seg.translated, FONT_SIZE, (0.15, 0.15, 0.15))
            y -= LINE_HEIGHT / 2

        # ── Original text pages ───────────────────────────────────────────
        page, y = add_page()

        separator = "--- Original Text ---"
        try:
            tw = fitz.TextWriter(page.rect)
            tw.append(fitz.Point(MARGIN, y), separator, font=font, fontsize=13)
            tw.write_text(page, color=(0.5, 0.5, 0.5))
        except Exception:
            page.insert_text(fitz.Point(MARGIN, y), separator, fontsize=13, color=(0.5, 0.5, 0.5))
        y -= 30

        for seg in body.segments:
            if not seg.original.strip():
                continue
            page, y = draw_paragraph(page, y, seg.original, FONT_SIZE, (0.4, 0.4, 0.4))
            y -= LINE_HEIGHT / 2

        pdf_bytes = doc.tobytes()
        doc.close()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="translated_{body.file_name}.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )

    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
