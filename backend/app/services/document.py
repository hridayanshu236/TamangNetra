import io
import hashlib
import tempfile
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from PIL import Image
import pytesseract
from fastapi import UploadFile, Depends
import re
import requests as req
import logging

from app.services.translation import get_translation_service, TranslationService
from app.core.config import Settings, get_settings
from app.models.schemas import TranslationRequest

# Native PDF Pipeline
from .pdf.native_reconstructor import NativePdfReconstructor

try:
    from .pdf.ocr import OcrHandler
except ImportError:
    OcrHandler = None

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self, translation_service: TranslationService):
        self.translation_service = translation_service
        self.native_reconstructor = NativePdfReconstructor(
            font_path="assets/fonts/NotoSansDevanagari-Regular.ttf",
            font_bold_path="assets/fonts/NotoSansDevanagari-Bold.ttf"
        )
        self.ocr_handler = OcrHandler() if OcrHandler else None

    async def process_pdf(self, file_content: bytes, src_lang: str, tgt_lang: str, progress_callback=None) -> Dict[str, Any]:
        """Bit-Identical Native Span Extraction for PDF."""
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            orig_texts = []
            for page in doc:
                blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
                for block in blocks:
                    if block["type"] == 0:
                        for line in block["lines"]:
                            for span in line["spans"]:
                                txt = span["text"].strip()
                                if txt: orig_texts.append(txt)
            
            unique_texts = list(set([t for t in orig_texts if t.strip()]))
            translated_list = await self.translation_service.batch_translate(
                unique_texts, src_lang, tgt_lang, progress_callback=progress_callback, translate_all=True
            )
            trans_map = dict(zip(unique_texts, translated_list))
            
            results = [{"original": t, "translated": trans_map.get(t, t)} for t in orig_texts]
            return {
                "original": "\n".join(orig_texts),
                "translated": "\n".join([r["translated"] for r in results]),
                "segments": results
            }
        except Exception as e:
            logger.error(f"Native PDF extraction failed: {e}")
            return {"original": "", "translated": "", "segments": []}

    async def process_docx(self, file_content: bytes) -> str:
        doc = DocxDocument(io.BytesIO(file_content))
        run_texts = []
        for para in doc.paragraphs:
            for run in para.runs:
                if run.text.strip(): run_texts.append(run.text)
        return "---EXACT-BLOCK---".join(run_texts)

    async def process_file(self, file_content: bytes, file_name: str, file_size: int, src_lang: str, tgt_lang: str, progress_callback = None) -> Dict[str, Any]:
        filename = file_name.lower()
        try:
            if filename.endswith(".pdf"):
                pdf_res = await self.process_pdf(file_content, src_lang, tgt_lang, progress_callback=progress_callback)
                return {**pdf_res, "fileInfo": {"name": file_name, "type": "pdf", "size": file_size}}
            
            # (DOCX handling included for completeness)
            if filename.endswith(".docx"):
                extracted_text = await self.process_docx(file_content)
                segments = [s.strip() for s in extracted_text.split("---EXACT-BLOCK---") if s.strip()]
                translated = await self.translation_service.batch_translate(segments, src_lang, tgt_lang, progress_callback=progress_callback)
                return {
                    "original": extracted_text,
                    "translated": "\n".join(translated),
                    "segments": [{"original": o, "translated": t} for o, t in zip(segments, translated)],
                    "fileInfo": {"name": file_name, "type": "docx", "size": file_size}
                }
            
            return {"original": "", "translated": "", "segments": [], "fileInfo": {"name": file_name, "type": "unknown"}}
        except Exception as e:
            raise ValueError(f"Error processing document: {str(e)}")

    async def reconstruct_file(self, file: UploadFile, src_lang: str, tgt_lang: str) -> tuple[bytes, str]:
        content = await file.read()
        filename = file.filename.lower()
        try:
            if filename.endswith(".pdf"):
                processed = await self.process_pdf(content, src_lang, tgt_lang)
                trans_map = {item["original"]: item["translated"] for item in processed["segments"]}
                reconstructed = self.native_reconstructor.reconstruct(content, trans_map)
                return reconstructed, "application/pdf"
            
            # Fallback for non-PDF
            return content, "application/octet-stream"
        except Exception as e:
            raise ValueError(f"Error reconstructing document: {str(e)}")

def get_document_processor(translation_service: TranslationService = Depends(get_translation_service)) -> DocumentProcessor:
    return DocumentProcessor(translation_service)
