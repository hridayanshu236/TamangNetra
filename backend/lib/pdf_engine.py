import fitz
import io
from typing import List, Dict, Tuple
from dataclasses import dataclass
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

try:
    pdfmetrics.registerFont(TTFont('NotoDevanagari', 'fonts/NotoSansDevanagari-Regular.ttf'))
    DEVA_FONT = 'NotoDevanagari'
except Exception as e:
    DEVA_FONT = 'Helvetica'

@dataclass
class TextBlock:
    id: int
    text: str
    x: float
    y: float
    width: float
    height: float
    font_size: float
    page: int
    page_width: float = 595.0
    page_height: float = 842.0

class PdfEngine:
    def extract(self, file_bytes: bytes) -> List[TextBlock]:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        blocks_out = []
        block_id = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            rect = page.rect
            page_dict = page.get_text("dict")
            for block in page_dict.get("blocks", []):
                if block.get("type") == 0:  # text block
                    block_texts = []
                    font_size = 12.0
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            block_texts.append(span.get("text", ""))
                            font_size = span.get("size", font_size)
                    
                    full_text = " ".join(block_texts).strip()
                    if len(full_text) >= 3:
                        bbox = block.get("bbox", [0, 0, 0, 0])
                        x, y, x1, y1 = bbox
                        blocks_out.append(TextBlock(
                            id=block_id,
                            text=full_text,
                            x=x,
                            y=y,
                            width=x1 - x,
                            height=y1 - y,
                            font_size=font_size,
                            page=page_num,
                            page_width=rect.width,
                            page_height=rect.height
                        ))
                        block_id += 1
        return blocks_out

    def get_full_text(self, file_bytes: bytes) -> Tuple[List[TextBlock], str]:
        blocks = self.extract(file_bytes)
        full_text = "\n\n".join(b.text for b in blocks)
        return blocks, full_text

    def reconstruct(self, blocks: List[TextBlock], translations: Dict[int, str], target: str = "NP") -> bytes:
        if not blocks:
            return b""
            
        font_name = DEVA_FONT if target in ("NP", "TM") else "Helvetica"
        
        buffer = io.BytesIO()
        
        # Group blocks by page
        pages = {}
        for b in blocks:
            pages.setdefault(b.page, []).append(b)
            
        max_page = max(pages.keys()) if pages else 0
        
        c = None
        for page_num in range(max_page + 1):
            page_blocks = pages.get(page_num, [])
            
            p_width, p_height = 595.0, 842.0
            if page_blocks:
                p_width = page_blocks[0].page_width
                p_height = page_blocks[0].page_height
                
            if c is None:
                c = canvas.Canvas(buffer, pagesize=(p_width, p_height))
            else:
                c.showPage()
                c.setPageSize((p_width, p_height))
                
            for b in page_blocks:
                translated_text = translations.get(b.id, b.text)
                
                f_size = b.font_size
                if len(translated_text) > 1.3 * len(b.text):
                    f_size = max(8.0, f_size * 0.8)
                    
                c.setFont(font_name, f_size)
                
                lines = simpleSplit(translated_text, font_name, f_size, b.width)
                
                current_y = p_height - b.y - f_size
                for line in lines:
                    c.drawString(b.x, current_y, line)
                    current_y -= (f_size * 1.2)
                    
        if c is not None:
            c.save()
            
        return buffer.getvalue()

if __name__ == "__main__":
    import fitz
    dummy_doc = fitz.open()
    dummy_page = dummy_doc.new_page()
    dummy_page.insert_text((50, 50), "Hello world from test PDF. This is a long sentence to test wrapping.")
    dummy_bytes = dummy_doc.write()
    
    engine = PdfEngine()
    blocks, text = engine.get_full_text(dummy_bytes)
    print(f"Extracted {len(blocks)} blocks. Text: {text}")
    
    translations = {0: "नमस्ते विश्व परीक्षण पीडीएफबाट।"}
    out_bytes = engine.reconstruct(blocks, translations, "NP")
    print(f"Reconstructed PDF size: {len(out_bytes)} bytes")
