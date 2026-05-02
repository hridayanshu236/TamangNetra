import fitz
import pdfplumber
import re
import logging
import base64
import io
from typing import List, Dict, Any
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class HighFidelityPdfExtractor:
    def __init__(self):
        pass

    def pdf_to_html(self, file_bytes: bytes) -> str:
        """
        Convert PDF to a structurally rich HTML format.
        Preserves:
        - Tables (as <table>)
        - Math (protected as LaTeX or high-fidelity spans)
        - Images (many formulas are images)
        - Layout (paragraphs, headers)
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        html_output = "<html><head><meta charset='utf-8'/><style>"
        html_output += self._get_default_css()
        html_output += "</style></head><body>"

        with pdfplumber.open(fitz.io.BytesIO(file_bytes)) as pl_doc:
            for page_idx, page in enumerate(doc):
                pl_page = pl_doc.pages[page_idx]
                
                # Page wrapper
                html_output += f"<div class='page' style='width: {page.rect.width}pt; height: {page.rect.height}pt; position: relative;'>"
                
                # 1. Detect Tables using pdfplumber
                tables = pl_page.find_tables()
                table_bboxes = [t.bbox for t in tables]
                
                # 2. Extract Blocks (Text and Images)
                blocks = page.get_text("dict")["blocks"]
                
                for block in blocks:
                    bbox = block["bbox"]
                    
                    # Skip if block is inside a table
                    if self._is_inside_any(bbox, table_bboxes):
                        continue
                        
                    if block["type"] == 0:  # Text block
                        html_output += self._process_text_block(block)
                    elif block["type"] == 1: # Image block
                        html_output += self._process_image_block(page, block)

                # 3. Process Tables
                for table in tables:
                    html_output += self._process_table(table)

                html_output += "</div>" # Close page

        html_output += "</body></html>"
        return html_output

    def _is_inside_any(self, bbox, table_bboxes):
        for t_bbox in table_bboxes:
            if bbox[0] >= t_bbox[0] - 2 and bbox[1] >= t_bbox[1] - 2 and \
               bbox[2] <= t_bbox[2] + 2 and bbox[3] <= t_bbox[3] + 2:
                return True
        return False

    def _process_text_block(self, block: Dict) -> str:
        block_html = ""
        for line in block["lines"]:
            line_html = "<div class='line' style='position: absolute; left: {0}pt; top: {1}pt;'>".format(
                line["bbox"][0], line["bbox"][1]
            )
            # Merge spans in the line to avoid fragmented translation
            full_line_text = "".join([span["text"] for span in line["spans"]])
            if not full_line_text.strip(): continue
            
            # Use the first span's size as a heuristic for the whole line
            avg_size = line["spans"][0]["size"] if line["spans"] else 10
            
            if self._is_math(full_line_text):
                line_html += f"<span class='math' style='font-size: {avg_size}pt;'>{full_line_text}</span>"
            else:
                line_html += f"<span style='font-size: {avg_size}pt;'>{full_line_text}</span>"
            
            line_html += "</div>"
            block_html += line_html
        return block_html

    def _process_image_block(self, page, block: Dict) -> str:
        """Embed images as base64. Many formulas are small images."""
        bbox = block["bbox"]
        try:
            pix = page.get_pixmap(clip=bbox, matrix=fitz.Matrix(2, 2)) # Higher resolution
            img_data = pix.tobytes("png")
            b64_data = base64.b64encode(img_data).decode('utf-8')
            
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            
            return f"<img src='data:image/png;base64,{b64_data}' style='position: absolute; left: {bbox[0]}pt; top: {bbox[1]}pt; width: {w}pt; height: {h}pt;' />"
        except Exception as e:
            logger.warning(f"Failed to extract image block: {e}")
            return ""

    def _process_table(self, table) -> str:
        bbox = table.bbox
        data = table.extract()
        if not data: return ""
        
        table_html = f"<div class='table-wrapper' style='position: absolute; left: {bbox[0]}pt; top: {bbox[1]}pt;'>"
        table_html += "<table border='1' style='border-collapse: collapse;'>"
        for row in data:
            table_html += "<tr>"
            for cell in row:
                cell_text = cell if cell else ""
                table_html += f"<td>{cell_text}</td>"
            table_html += "</tr>"
        table_html += "</table></div>"
        return table_html

    def _is_math(self, text: str) -> bool:
        # Heuristic for math: greek, operators, subscripts, or unusual characters
        math_patterns = [
            r'[\u2200-\u22FF]', # Operators
            r'[\u2190-\u21FF]', # Arrows
            r'[\u0370-\u03FF]', # Greek
            r'\^', r'\_',       # Sub/Super
            r'\\', r'\{', r'\}',
            r'[∫∑√∞π∂∆∇∏]'      # Common symbols
        ]
        # Also check if text is a single italic letter or symbol
        if len(text.strip()) == 1 and text.strip().isalpha():
            return True
        return any(re.search(p, text) for p in math_patterns)

    def _get_default_css(self) -> str:
        return """
            body { margin: 0; padding: 0; }
            .page { background: white; margin-bottom: 20px; overflow: hidden; page-break-after: always; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .line { white-space: nowrap; line-height: 1; }
            .math { font-family: 'Cambria Math', 'Times New Roman', serif; font-style: italic; }
            table { font-size: 8pt; width: 100%; border: 1px solid #000; }
            td { padding: 2pt; border: 1px solid #000; min-height: 10pt; }
            img { display: block; }
        """
