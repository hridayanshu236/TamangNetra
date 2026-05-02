import fitz
import io
import os
import re
import logging
from typing import Dict
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color

logger = logging.getLogger(__name__)

class NativePdfReconstructor:
    """
    Refined Hybrid Reconstructor with Formula Protection.
    Uses surgical redaction for translated text only, protecting technical graphics.
    """
    def __init__(self, font_path: str, font_bold_path: str = None):
        self.font_path = os.path.abspath(font_path)
        self.font_bold_path = os.path.abspath(font_bold_path) if font_bold_path else self.font_path
        
        if not os.path.exists(self.font_path):
            raise RuntimeError(f"Font not found: {self.font_path}")
            
        pdfmetrics.registerFont(TTFont('Deva', self.font_path))
        pdfmetrics.registerFont(TTFont('DevaBold', self.font_bold_path))

    def _clean_text(self, text: str) -> str:
        return re.sub(r'[\ue000-\uf8ff]', '', text)

    def _is_math(self, font_name: str, text: str) -> bool:
        """Heuristic to identify formulas/math symbols."""
        math_fonts = ['math', 'symbol', 'cmex', 'cmsy', 'msam', 'msbm']
        if any(m in font_name.lower() for m in math_fonts):
            return True
        # If it's a single char and not alphanumeric, likely math/symbol
        if len(text.strip()) == 1 and not text.strip().isalnum():
            return True
        return False

    def reconstruct(self, original_pdf: bytes, translation_map: Dict[str, str]) -> bytes:
        src_doc = fitz.open(stream=original_pdf, filetype="pdf")
        
        for page_idx, page in enumerate(src_doc):
            p_width, p_height = page.rect.width, page.rect.height
            rl_buffer = io.BytesIO()
            c = canvas.Canvas(rl_buffer, pagesize=(p_width, p_height))
            
            # High-res pixmap for better background sampling in tables
            pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
            
            blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
            
            for block in blocks:
                if block["type"] == 0:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            orig_text = span["text"].strip()
                            if not orig_text: continue
                            
                            # FORMULA PROTECTION: Skip if it looks like math
                            if self._is_math(span["font"], orig_text):
                                continue
                                
                            trans_text = translation_map.get(orig_text, orig_text)
                            # Only redact if we actually have a translation and it's DIFFERENT
                            if not trans_text or trans_text == orig_text:
                                continue
                            
                            trans_text = self._clean_text(trans_text)
                            bbox = fitz.Rect(span["bbox"])
                            
                            # MEDIAN COLOR SAMPLING (Table-aware)
                            # Sample from the corner of the bbox
                            sx, sy = int(bbox.x0), int(bbox.y0)
                            bg = (1, 1, 1)
                            try:
                                if 0 <= sx < pix.width and 0 <= sy < pix.height:
                                    p = pix.pixel(sx, sy)
                                    bg = (p[0]/255, p[1]/255, p[2]/255)
                            except: pass
                            
                            # REDACT ONLY TRANSLATED TEXT
                            page.add_redact_annot(bbox, fill=bg)

                            # OVERLAY (ReportLab Layer)
                            rx, ry = bbox.x0, p_height - bbox.y1
                            if any(ord(char) > 127 for char in trans_text): ry += 1.5 

                            is_bold = bool(span["flags"] & 16)
                            f_name = 'DevaBold' if is_bold else 'Deva'
                            
                            sc = span["color"]
                            r, g, b = ((sc>>16)&0xFF)/255, ((sc>>8)&0xFF)/255, (sc&0xFF)/255
                            if abs(r-bg[0]) + abs(g-bg[1]) + abs(b-bg[2]) < 0.2:
                                r, g, b = (0, 0, 0) if sum(bg) > 1.5 else (1, 1, 1)
                            
                            c.setFillColor(Color(r, g, b))
                            c.setFont(f_name, span["size"])
                            
                            target_w = bbox.width
                            if target_w > 5:
                                current_w = c.stringWidth(trans_text, f_name, span["size"])
                                if current_w > target_w:
                                    f_size = span["size"] * (target_w / current_w)
                                    c.setFont(f_name, f_size)
                            
                            c.drawString(rx, ry, trans_text)
            
            # Apply redactions (clears text, leaves everything else)
            page.apply_redactions(images=0, graphics=0)
            
            c.showPage()
            c.save()
            
            rl_pdf = fitz.open(stream=rl_buffer.getvalue(), filetype="pdf")
            page.show_pdf_page(page.rect, rl_pdf, 0, keep_proportion=True)
            rl_pdf.close()

        output_bytes = src_doc.write(garbage=4, deflate=True)
        src_doc.close()
        return output_bytes
