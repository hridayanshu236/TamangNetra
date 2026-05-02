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

    def _is_math(self, text: str) -> bool:
        """Heuristic to identify math/formulas that should not be translated."""
        t = text.strip()
        if len(t) <= 1 and not t.isalnum(): return True
        if any(c in t for c in ['=', '+', '^', '∫', '∑', '∏', '√', '∂', '∆']):
            if len(t) < 8: return True
        if '\\' in t or (len(t) < 10 and '_' in t): return True
        return False

    def _normalize(self, t: str) -> str:
        """Helper for consistent whitespace handling."""
        return re.sub(r'\s+', ' ', t).strip()

    async def _process_spreadsheet(self, file_content: bytes, file_type: str, src_lang: str, tgt_lang: str, progress_callback=None) -> Dict[str, Any]:
        """Restored spreadsheet processing with real-time progress updates."""
        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_type == "tsv":
            df = pd.read_csv(io.BytesIO(file_content), sep='\t')
        else:
            df = pd.read_excel(io.BytesIO(file_content))
            
        texts_to_translate = []
        for col in df.columns:
            texts_to_translate.append(str(col))
        for _, row in df.iterrows():
            for val in row:
                if pd.isna(val):
                    texts_to_translate.append("")
                else:
                    texts_to_translate.append(str(val))
                    
        # Pass progress_callback to show real-time updates in frontend
        translated_texts = await self.translation_service.batch_translate(
            texts_to_translate, src_lang, tgt_lang, progress_callback=progress_callback
        )
        
        return {
            "original": df.to_csv(index=False),
            "translated": "Tabular data translated.",
            "segments": [{"original": o, "translated": t} for o, t in zip(texts_to_translate, translated_texts) if o.strip()]
        }

    async def process_pdf(self, file_content: bytes, src_lang: str, tgt_lang: str, progress_callback=None, cache_only: bool = False) -> Dict[str, Any]:
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
            
            translatable_texts = []
            for t in list(set(orig_texts)):
                cleaned = self._normalize(t)
                if cleaned and not self._is_math(cleaned):
                    translatable_texts.append(cleaned)
            
            logger.info(f"PDF Extraction: Found {len(orig_texts)} spans, {len(translatable_texts)} translatable unique strings.")
            
            translated_list = await self.translation_service.batch_translate(
                translatable_texts, src_lang, tgt_lang, 
                progress_callback=progress_callback, 
                translate_all=True,
                cache_only=cache_only
            )
            
            trans_map = dict(zip(translatable_texts, translated_list))
            
            # Diagnostic: Count how many actually got translated
            translated_count = sum(1 for k, v in trans_map.items() if k != v)
            logger.info(f"Translation Map: {translated_count}/{len(trans_map)} strings actually translated.")
            
            results = []
            for t in orig_texts:
                results.append({
                    "original": t,
                    "translated": trans_map.get(self._normalize(t), t)
                })
                
            return {
                "original": "\n".join(orig_texts),
                "translated": "\n".join([r["translated"] for r in results]),
                "segments": results
            }
        except Exception as e:
            logger.error(f"Native PDF extraction failed: {e}", exc_info=True)
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
                pdf_res = await self.process_pdf(file_content, src_lang, tgt_lang, progress_callback=progress_callback, cache_only=False)
                return {**pdf_res, "fileInfo": {"name": file_name, "type": "pdf", "size": file_size}}
            
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
            
            if filename.endswith((".csv", ".tsv", ".xlsx")):
                if filename.endswith(".csv"): file_type = "csv"
                elif filename.endswith(".tsv"): file_type = "tsv"
                else: file_type = "xlsx"
                res = await self._process_spreadsheet(file_content, file_type, src_lang, tgt_lang, progress_callback=progress_callback)
                return {**res, "fileInfo": {"name": file_name, "type": file_type, "size": file_size}}
            
            return {"original": "", "translated": "", "segments": [], "fileInfo": {"name": file_name, "type": "unknown"}}
        except Exception as e:
            raise ValueError(f"Error processing document: {str(e)}")

    async def reconstruct_file(self, file: UploadFile, src_lang: str, tgt_lang: str) -> tuple[bytes, str]:
        content = await file.read()
        filename = file.filename.lower()
        try:
            if filename.endswith(".pdf"):
                processed = await self.process_pdf(content, src_lang, tgt_lang, cache_only=True)
                trans_map = {item["original"]: item["translated"] for item in processed["segments"]}
                reconstructed = self.native_reconstructor.reconstruct(content, trans_map)
                return reconstructed, "application/pdf"
            
            if filename.endswith(".docx"):
                doc = DocxDocument(io.BytesIO(content))
                # Collect all unique runs for batch translation lookup
                run_texts = []
                for para in doc.paragraphs:
                    for run in para.runs:
                        if run.text.strip(): run_texts.append(run.text)
                
                # Use cache_only for fast reconstruction
                unique_runs = list(set(run_texts))
                translated = await self.translation_service.batch_translate(unique_runs, src_lang, tgt_lang, cache_only=True)
                trans_map = dict(zip(unique_runs, translated))
                
                # Replace in document
                for para in doc.paragraphs:
                    for run in para.runs:
                        if run.text.strip():
                            run.text = trans_map.get(run.text, run.text)
                
                out_buffer = io.BytesIO()
                doc.save(out_buffer)
                return out_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
            if filename.endswith((".csv", ".tsv", ".xlsx")):
                if filename.endswith(".csv"): file_type = "csv"
                elif filename.endswith(".tsv"): file_type = "tsv"
                else: file_type = "xlsx"
                
                if file_type == "csv":
                    df = pd.read_csv(io.BytesIO(content))
                elif file_type == "tsv":
                    df = pd.read_csv(io.BytesIO(content), sep='\t')
                else:
                    df = pd.read_excel(io.BytesIO(content))
                
                texts = []
                for col in df.columns: texts.append(str(col))
                for _, row in df.iterrows():
                    for val in row: texts.append(str(val) if pd.notnull(val) else "")
                
                translated = await self.translation_service.batch_translate(texts, src_lang, tgt_lang, cache_only=True)
                trans_map = dict(zip(texts, translated))
                
                df.columns = [trans_map.get(str(col), str(col)) for col in df.columns]
                for col in df.columns:
                    df[col] = df[col].apply(lambda x: trans_map.get(str(x), str(x)) if pd.notnull(x) else x)
                
                out = io.BytesIO()
                if file_type == "csv":
                    df.to_csv(out, index=False)
                elif file_type == "tsv":
                    df.to_csv(out, index=False, sep='\t')
                else:
                    df.to_excel(out, index=False)
                
                mtype = "text/csv" if file_type == "csv" else ("text/tab-separated-values" if file_type == "tsv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                return out.getvalue(), mtype

            return content, "application/octet-stream"
        except Exception as e:
            raise ValueError(f"Error reconstructing document: {str(e)}")

def get_document_processor(translation_service: TranslationService = Depends(get_translation_service)) -> DocumentProcessor:
    return DocumentProcessor(translation_service)
