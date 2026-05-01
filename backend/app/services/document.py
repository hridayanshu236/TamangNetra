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
        """Extract text from PDF block-by-block with OCR fallback."""
        doc = fitz.open(stream=file_content, filetype="pdf")
        text_segments = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            blocks = page.get_text("dict")["blocks"]
            found_text = False
            for block in blocks:
                if block.get("type") == 0:  # text block
                    block_text = ""
                    for line in block["lines"]:
                        for span in line["spans"]:
                            block_text += span["text"]
                        if not block_text.endswith(" ") and not block_text.endswith("-"):
                            block_text += " "
                    if block_text.strip():
                        text_segments.append(block_text.strip())
                        found_text = True
            
            # If no text found on page, try OCR on images
            if not found_text:
                image_list = page.get_images(full=True)
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    try:
                        image = Image.open(io.BytesIO(image_bytes))
                        ocr_text = pytesseract.image_to_string(image)
                        if ocr_text.strip():
                            text_segments.append(ocr_text.strip())
                    except Exception as e:
                        logger.debug(f"OCR skipped for page {page_num}: {e}")
                        
        return "---EXACT-BLOCK---".join(text_segments)

    async def process_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX run-by-run to match reconstruction exactly."""
        doc = DocxDocument(io.BytesIO(file_content))
        run_texts = []
        
        def _collect_runs(paragraphs):
            for para in paragraphs:
                for run in para.runs:
                    if run.text.strip():
                        run_texts.append(run.text)

        for para in doc.paragraphs:
            _collect_runs([para])

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    _collect_runs(cell.paragraphs)
                    
        return "---EXACT-BLOCK---".join(run_texts)

    async def process_spreadsheet(self, file_content: bytes, file_type: str) -> str:
        """Extract text from CSV or Excel cell-by-cell to match reconstruction."""
        if file_type == 'csv':
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            df = pd.read_excel(io.BytesIO(file_content))
            
        cells = list(df.columns)
        for _, row in df.iterrows():
            for val in row.values:
                cells.append(str(val) if pd.notna(val) else "")
                
        # Filter empty and join with PAGE-BREAK so they are processed as isolated blocks
        cells = [c for c in cells if str(c).strip()]
        return "---PAGE-BREAK---".join(cells)

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
        """
        Split text into sentences.
        We split by blocks (pages) first to ensure 100% cache hits 
        during reconstruction while remaining immune to line breaks.
        """
        if "---EXACT-BLOCK---" in text:
            # DOCX uses exact blocks run-by-run without sentence splitting
            return [b for b in text.split("---EXACT-BLOCK---") if b.strip()]

        all_segments = []
        # Split by our internal page marker if present
        blocks = text.split("---PAGE-BREAK---")
        
        for block in blocks:
            # 1. Normalize ALL whitespace within this block into single spaces
            block = re.sub(r'\s+', ' ', block).strip()
            if not block:
                continue
                
            # 2. Split into sentences using punctuation boundaries
            # Supports English (.!?) and Devanagari (।)
            line_sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+', block) if s.strip()]
            
            for s in line_sentences:
                # 3. Standardize sentence endings
                if not re.search(r'[.!?।]$', s):
                    s += '.'
                all_segments.append(s)
                
        return all_segments

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
            try:
                # Direct link to Noto Sans Devanagari Regular
                font_url = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf"
                font_bytes = _get_font_bytes(font_url)
            except Exception as e:
                logger.error(f"Failed to download Devanagari font: {e}")

        # ── Collect per-page data using EXACT SAME extraction as process_pdf ──
        page_blocks_data = []
        all_blocks_text = []

        for page in doc:
            page_blocks = []
            img_rects = []
            blocks = page.get_text("dict")["blocks"]
            
            for block in blocks:
                if block.get("type") == 1:
                    img_rects.append(fitz.Rect(block["bbox"]))

            def overlaps_image(bbox: fitz.Rect) -> bool:
                for ir in img_rects:
                    inter = bbox & ir
                    if not inter.is_empty and inter.get_area() > 0.5 * bbox.get_area():
                        return True
                return False

            found_any = False
            for block in blocks:
                if block.get("type") == 0:
                    rect = fitz.Rect(block["bbox"])
                    # Safeguard: Skip background blocks that cover most of the page
                    if rect.width > page.rect.width * 0.8 and rect.height > page.rect.height * 0.8:
                        continue

                    block_text = ""
                    first_size = 11.0
                    for line in block["lines"]:
                        for span in line["spans"]:
                            block_text += span["text"]
                            first_size = span.get("size", first_size)
                        if not block_text.endswith(" ") and not block_text.endswith("-"):
                            block_text += " "
                            
                    block_text = block_text.strip()
                    if block_text:
                        all_blocks_text.append(block_text)
                        page_blocks.append({
                            "rect": rect,
                            "size": first_size,
                            "overlaps_image": overlaps_image(rect),
                            "is_ocr": False
                        })
                        found_any = True
            
            # OCR fallback for reconstruction
            if not found_any:
                image_list = page.get_images(full=True)
                for img in image_list:
                    xref = img[0]
                    bbox = page.get_image_bbox(img)
                    base_image = doc.extract_image(xref)
                    try:
                        image = Image.open(io.BytesIO(base_image["image"]))
                        ocr_text = pytesseract.image_to_string(image).strip()
                        if ocr_text:
                            all_blocks_text.append(ocr_text)
                            page_blocks.append({
                                "rect": bbox,
                                "size": 12.0,
                                "overlaps_image": False,
                                "is_ocr": True
                            })
                    except: continue

            page_blocks_data.append((page, page_blocks))

        if not all_blocks_text:
            return doc.write()

        translated = await self.translation_service.batch_translate(
            all_blocks_text, src_lang, tgt_lang
        )

        idx = 0
        
        for page, page_blocks in page_blocks_data:
            # Register font and get the internal name (e.g. 'f0')
            registered_font = "helv"
            if font_bytes:
                try:
                    registered_font = page.insert_font(fontname="noto", fontbuffer=font_bytes)
                except Exception as e:
                    logger.error(f"Page font insertion failed: {e}")
            
            for b in page_blocks:
                trans_text = translated[idx]
                idx += 1
                
                if not b["overlaps_image"]:
                    try:
                        # 1. Clear the original text area with a white box
                        page.draw_rect(b["rect"], color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
                        
                        # 2. Insert translated text using the registered font name
                        page.insert_textbox(
                            b["rect"],
                            trans_text,
                            fontsize=b["size"],
                            fontname=registered_font,
                            align=0,
                            color=(0, 0, 0)
                        )
                    except Exception as e:
                        logger.warning(f"Text insertion failed for block: {e}")

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
