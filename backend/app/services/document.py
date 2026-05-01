import io
import tempfile
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from PIL import Image
import pytesseract
from fastapi import UploadFile
import re
import requests as req
import logging

from app.services.translation import get_translation_service, TranslationService
from app.core.config import Settings
from app.models.schemas import TranslationRequest

logger = logging.getLogger(__name__)

# Module-level font cache
_font_cache: dict[str, bytes] = {}

def _get_font_bytes(url: str) -> bytes:
    """Download and cache a font file by URL."""
    if url not in _font_cache:
        logger.info(f"Downloading font from {url}...")
        r = req.get(url, timeout=20)
        r.raise_for_status()
        _font_cache[url] = r.content
        logger.info("Font downloaded and cached.")
    return _font_cache[url]


class DocumentProcessor:
    def __init__(self, translation_service: TranslationService):
        self.translation_service = translation_service

    async def process_pdf(self, file_content: bytes) -> str:
        """Extract text and OCR images from PDF."""
        text_segments = []
        doc = fitz.open(stream=file_content, filetype="pdf")
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            # Extract standard text
            text = page.get_text()
            if text.strip():
                text_segments.append(text)
                
            # Extract images and apply OCR
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                try:
                    image = Image.open(io.BytesIO(image_bytes))
                    ocr_text = pytesseract.image_to_string(image)
                    if ocr_text.strip():
                        text_segments.append(f"--- Image {img_index+1} OCR ---\n{ocr_text.strip()}")
                except Exception as e:
                    logger.debug(f"OCR skipped for image {img_index} (tesseract not available): {e}")
                    
        return "\n\n".join(text_segments)

    async def process_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX."""
        doc = DocxDocument(io.BytesIO(file_content))
        text_segments = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_segments.append(paragraph.text.strip())
                
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    text_segments.append(row_text)
                    
        return "\n".join(text_segments)

    async def process_spreadsheet(self, file_content: bytes, file_type: str) -> str:
        """Extract text from CSV or Excel."""
        if file_type == 'csv':
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            df = pd.read_excel(io.BytesIO(file_content))
            
        text_segments = []
        # Join column names
        text_segments.append(" | ".join([str(col) for col in df.columns]))
        
        # Join row values
        for _, row in df.iterrows():
            row_text = " | ".join([str(val) for val in row.values if pd.notna(val)])
            if row_text.strip():
                text_segments.append(row_text)
                
        return "\n".join(text_segments)

    async def process_image(self, file_content: bytes) -> str:
        """Apply OCR directly to an image file."""
        try:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")

    async def process_file(self, file_content: bytes, file_name: str, file_size: int, src_lang: str, tgt_lang: str, progress_callback = None) -> Dict[str, Any]:
        """Main dispatcher for processing files."""
        content = file_content
        filename = file_name.lower()
        
        extracted_text = ""
        
        try:
            if filename.endswith(".pdf"):
                extracted_text = await self.process_pdf(content)
            elif filename.endswith(".docx"):
                extracted_text = await self.process_docx(content)
            elif filename.endswith(".csv"):
                extracted_text = await self.process_spreadsheet(content, 'csv')
            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                extracted_text = await self.process_spreadsheet(content, 'excel')
            elif filename.endswith((".jpg", ".jpeg", ".png")):
                extracted_text = await self.process_image(content)
            else:
                raise ValueError("Unsupported file format")
                
            if not extracted_text.strip():
                raise ValueError("No text could be extracted from the document")
                
            # Split into manageable chunks at the sentence level
            segments = self._split_into_sentences(extracted_text)
            
            # Translate segments
            translated_segments = []
            results = []
            
            # Use batch_translate if the translation service supports it natively
            # Since we have it in TranslationService:
            translated_texts = await self.translation_service.batch_translate(
                texts=segments,
                source_language=src_lang,
                target_language=tgt_lang,
                progress_callback=progress_callback
            )
            
            for orig, trans in zip(segments, translated_texts):
                results.append({
                    "original": orig,
                    "translated": trans
                })
                
            return {
                "original": extracted_text,
                "translated": "\n".join(translated_texts),
                "segments": results,
                "fileInfo": {
                    "name": file_name,
                    "type": filename.split('.')[-1] if '.' in filename else 'unknown',
                    "size": file_size
                }
            }
            
        except Exception as e:
            raise ValueError(f"Error processing document: {str(e)}")

    def _split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentences matching the processing logic exactly."""
        segments = []
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            line_sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+', line) if s.strip()]
            for s in line_sentences:
                if not re.search(r'[.!?।]$', s):
                    s += '.'
                segments.append(s)
        return segments

    async def reconstruct_file(self, file: UploadFile, src_lang: str, tgt_lang: str) -> tuple[bytes, str]:
        """Reconstruct the translated file with exact layout/formatting."""
        content = await file.read()
        filename = file.filename.lower()
        
        try:
            if filename.endswith(".pdf"):
                return await self._reconstruct_pdf(content, src_lang, tgt_lang), "application/pdf"
            elif filename.endswith(".docx"):
                return await self._reconstruct_docx(content, src_lang, tgt_lang), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif filename.endswith(".csv"):
                return await self._reconstruct_spreadsheet(content, src_lang, tgt_lang, "csv"), "text/csv"
            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                return await self._reconstruct_spreadsheet(content, src_lang, tgt_lang, "excel"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                raise ValueError("Unsupported file format for reconstruction")
        except Exception as e:
            raise ValueError(f"Error reconstructing document: {str(e)}")

    async def _reconstruct_pdf(self, content: bytes, src_lang: str, tgt_lang: str) -> bytes:
        doc = fitz.open(stream=content, filetype="pdf")

        is_devanagari = tgt_lang.lower() in ("nepali", "ne", "tamang", "tam")
        font_bytes = None
        if is_devanagari:
            font_bytes = _get_font_bytes(
                "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/"
                "NotoSansDevanagari/NotoSansDevanagari-Regular.ttf"
            )

        # ── Collect per-page data using EXACT SAME extraction as process_pdf ──
        # process_pdf uses page.get_text() → _split_into_sentences() on full page text.
        # We do the same here to guarantee 100% cache key alignment.
        MATH_FONT_HINTS = ("math", "sym", "cmsy", "cmmi", "cmmib", "msam", "msbm", "euex", "stix", "xits")
        REDACT_FLAGS = fitz.PDF_REDACT_IMAGE_NONE
        try:
            REDACT_FLAGS |= fitz.PDF_REDACT_LINE_ART_NONE  # Added in PyMuPDF 1.23
        except AttributeError:
            pass

        page_data = []  # [(page, sentences, all_spans, first_point, first_size)]
        all_sentences_flat = []

        for page in doc:
            # Step 1: page.get_text() — exactly like process_pdf
            page_text = page.get_text()
            if not page_text.strip():
                continue

            # Step 2: _split_into_sentences — exactly like process_file
            sentences = self._split_into_sentences(page_text)
            if not sentences:
                continue

            # Step 3: Collect spans for redaction (skip math glyphs to preserve formulas)
            all_spans = []
            first_point = None
            first_size = 11.0
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        if not span["text"].strip():
                            continue
                        font_name = span.get("font", "").lower()
                        if any(h in font_name for h in MATH_FONT_HINTS):
                            continue  # preserve math formula glyphs
                        all_spans.append(span)
                        if first_point is None:
                            first_point = fitz.Point(span["bbox"][0], span["bbox"][3])
                            first_size = span["size"]

            if not all_spans or first_point is None:
                continue

            page_data.append((page, sentences, all_spans, first_point, first_size))
            all_sentences_flat.extend(sentences)

        if not page_data:
            return doc.write()

        # ── Batch-translate ALL sentences — guaranteed 100% cache hits ─────────
        translated_flat = await self.translation_service.batch_translate(
            all_sentences_flat, src_lang, tgt_lang
        )

        # ── Per-page: redact text spans, then insert translated text ──────────
        # Key: call insert_font AFTER apply_redactions so the font survives the
        # content-stream rebuild. Then insert_text with that fontname works fine.
        sent_idx = 0
        target_font = "F0" if font_bytes else "helv"
        for page, sentences, all_spans, first_point, first_size in page_data:
            page_translated = translated_flat[sent_idx: sent_idx + len(sentences)]
            sent_idx += len(sentences)
            translated_page_text = " ".join(page_translated)

            # Collect image bboxes so we can skip text spans that overlap images
            img_rects: list[fitz.Rect] = []
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") == 1:  # image block
                    img_rects.append(fitz.Rect(block["bbox"]))

            def overlaps_image(bbox: fitz.Rect) -> bool:
                for ir in img_rects:
                    inter = bbox & ir
                    if not inter.is_empty and inter.get_area() > 0.5 * bbox.get_area():
                        return True
                return False

            # Redact with white fill to visually erase original text.
            # Skip spans that significantly overlap image areas.
            for span in all_spans:
                span_rect = fitz.Rect(span["bbox"])
                if overlaps_image(span_rect):
                    continue  # don't redact over images
                page.add_redact_annot(span_rect, fill=(1, 1, 1))

            page.apply_redactions(images=REDACT_FLAGS)

            # Register font AFTER apply_redactions (rebuilds content stream).
            # Registering before would lose the reference.
            if font_bytes:
                page.insert_font(fontname="F0", fontbuffer=font_bytes)

            logger.info(
                f"Reconstruct page: {len(sentences)} sentences → "
                f"'{translated_page_text[:60]}...'"
            )

            # Insert translated text using a textbox to handle wrapping and avoid going off-screen
            if translated_page_text.strip():
                try:
                    # Define a rectangle starting from the first text position, 
                    # spanning to the right margin, and down to the bottom margin.
                    margin = 50
                    # PyMuPDF points: first_point.y is the baseline. 
                    # Move up by first_size to get the top of the box.
                    rect = fitz.Rect(
                        first_point.x,
                        first_point.y - first_size,
                        page.rect.width - margin,
                        page.rect.height - margin
                    )
                    
                    # If the rectangle is too small (e.g. text starts at the bottom),
                    # expand it to at least half the page height to allow flow.
                    if rect.height < 100:
                        rect.y1 = page.rect.height - margin

                    page.insert_textbox(
                        rect,
                        translated_page_text,
                        fontsize=first_size,
                        fontname=target_font,
                        align=0 # 0=left, 1=center, 2=right
                    )
                except Exception as e:
                    logger.warning(f"insert_textbox failed on page: {e}")

        return doc.write()





    async def _reconstruct_docx(self, content: bytes, src_lang: str, tgt_lang: str) -> bytes:
        """Translate DOCX run-by-run to preserve bold, italic, underline, fonts, and colours."""
        doc = DocxDocument(io.BytesIO(content))

        # Collect all runs from body paragraphs and table cells
        all_runs: list = []

        def _collect_runs(paragraphs):
            for para in paragraphs:
                for run in para.runs:
                    if run.text.strip():
                        all_runs.append(run)

        for para in doc.paragraphs:
            _collect_runs([para])

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    _collect_runs(cell.paragraphs)

        if not all_runs:
            out = io.BytesIO()
            doc.save(out)
            return out.getvalue()

        # Translate all run texts concurrently
        run_texts = [run.text for run in all_runs]
        translated = await self.translation_service.batch_translate(
            run_texts, src_lang, tgt_lang
        )

        # Write translated text back into each run.
        # We only update run.text — bold, italic, underline, font, size etc.
        # are all stored on the run's XML element and are untouched.
        for run, trans_text in zip(all_runs, translated):
            # Preserve a trailing space if the original had one
            if run.text.endswith(" ") and not trans_text.endswith(" "):
                trans_text += " "
            run.text = trans_text

        out = io.BytesIO()
        doc.save(out)
        return out.getvalue()

    async def _reconstruct_spreadsheet(self, content: bytes, src_lang: str, tgt_lang: str, file_type: str) -> bytes:
        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        texts_to_translate = list(df.columns)
        for _, row in df.iterrows():
            for val in row.values:
                texts_to_translate.append(str(val) if pd.notna(val) else "")
                
        all_sentences = []
        cell_sentences = []
        for cell_text in texts_to_translate:
            sentences = self._split_into_sentences(cell_text)
            cell_sentences.append(sentences)
            all_sentences.extend(sentences)
                
        # Translate ALL sentences for Track 2 CSV constraint
        translated = await self.translation_service.batch_translate(
            all_sentences, src_lang, tgt_lang, translate_all=True
        )
        
        idx = 0
        translated_cells = []
        for sentences in cell_sentences:
            translated_cell_sentences = translated[idx:idx + len(sentences)]
            idx += len(sentences)
            translated_cells.append(" ".join(translated_cell_sentences))
        
        new_columns = translated_cells[:len(df.columns)]
        translated_vals = translated_cells[len(df.columns):]
        
        df.columns = new_columns
        idx = 0
        for i in range(len(df)):
            for j in range(len(df.columns)):
                if texts_to_translate[len(df.columns) + idx]: # Only replace non-empty
                    # Cast to object first to prevent pandas warning when replacing int with string
                    if df.dtypes.iloc[j] != 'object':
                        df[df.columns[j]] = df[df.columns[j]].astype('object')
                    df.iat[i, j] = translated_vals[idx]
                idx += 1
                
        out = io.BytesIO()
        if file_type == "csv":
            df.to_csv(out, index=False)
        else:
            df.to_excel(out, index=False)
        return out.getvalue()

def get_document_processor(translation_service: TranslationService) -> DocumentProcessor:
    return DocumentProcessor(translation_service)
