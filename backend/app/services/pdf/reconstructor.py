import io
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader
from .extractor import PageData, TextSpan, TableBlock, ImageBlock

class PdfReconstructor:
    def __init__(self, font_regular_path: str, font_bold_path: str):
        # Register Devanagari fonts
        pdfmetrics.registerFont(TTFont('NotoSansDevanagari', str(font_regular_path)))
        pdfmetrics.registerFont(TTFont('NotoSansDevanagari-Bold', str(font_bold_path)))

    def reconstruct(self, pages_data: list[PageData], translated_map: dict) -> bytes:
        output = io.BytesIO()
        # Note: We'll set page size dynamically per page
        c = canvas.Canvas(output)

        for page in pages_data:
            c.setPageSize((page.width, page.height))
            h = page.height

            # 1. Place Images
            for img in page.images:
                # Transform Y: PyMuPDF (top-down) -> ReportLab (bottom-up)
                x = img.bbox[0]
                y = h - img.bbox[3] 
                w = img.bbox[2] - img.bbox[0]
                rh = img.bbox[3] - img.bbox[1]
                
                try:
                    img_reader = ImageReader(io.BytesIO(img.image_bytes))
                    c.drawImage(img_reader, x, y, width=w, height=rh)
                except Exception as e:
                    print(f"Error drawing image: {e}")

            # 2. Place Spans
            for span in page.spans:
                trans_text = translated_map.get(span.text, span.text)
                
                is_mostly_english = all(ord(char) < 128 for char in trans_text)
                
                # Switch font to Helvetica for English to ensure perfect visibility
                # Use NotoSansDevanagari for everything else
                if is_mostly_english:
                    font_name = 'Helvetica-Bold' if span.is_bold else 'Helvetica'
                else:
                    font_name = 'NotoSansDevanagari-Bold' if span.is_bold else 'NotoSansDevanagari'
                
                c.setFont(font_name, span.size)
                
                # Safety: Ensure color is visible (avoid pure white on white background)
                r, g, b = span.color
                if r > 0.95 and g > 0.95 and b > 0.95:
                    r, g, b = 0.2, 0.2, 0.2 
                c.setFillColor(Color(r, g, b))

                x = span.bbox[0]
                y_offset = 0 if is_mostly_english else 2
                y = h - span.bbox[3] + y_offset
                
                # Handle Overflow: Scale font down if text is too wide for the box
                target_w = span.bbox[2] - span.bbox[0]
                if target_w > 5: # Ignore tiny boxes
                    current_w = c.stringWidth(trans_text, font_name, span.size)
                    if current_w > target_w:
                        final_size = span.size * (target_w / current_w)
                        c.setFont(font_name, final_size)
                    c.drawString(x, y, trans_text)

            # 3. Place Tables (Basic grid + text)
            for table in page.tables:
                # We could use ReportLab's Table class for advanced styling, 
                # but drawing lines + text is more precise for layout matching.
                tx0, ty0, tx1, ty1 = table.bbox
                c.setStrokeColorRGB(0.8, 0.8, 0.8)
                c.rect(tx0, h - ty1, tx1 - tx0, ty1 - ty0, stroke=1, fill=0)

            c.showPage()
        
        c.save()
        return output.getvalue()
