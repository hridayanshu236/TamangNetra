import fitz
import pdfplumber
from dataclasses import dataclass
from typing import List, Optional, Tuple

@dataclass
class TextSpan:
    text: str
    bbox: Tuple[float, float, float, float]  # x0, y0, x1, y1
    size: float
    font: str
    is_bold: bool
    is_italic: bool
    color: Tuple[float, float, float]

@dataclass
class ImageBlock:
    bbox: Tuple[float, float, float, float]
    xref: int
    image_bytes: bytes
    ext: str

@dataclass
class TableBlock:
    bbox: Tuple[float, float, float, float]
    rows: List[List[str]]

@dataclass
class PageData:
    width: float
    height: float
    spans: List[TextSpan]
    images: List[ImageBlock]
    tables: List[TableBlock]

class PdfExtractor:
    def __init__(self):
        pass

    def extract(self, file_bytes: bytes) -> List[PageData]:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_data = []

        # Open with pdfplumber for table detection
        with pdfplumber.open(fitz.io.BytesIO(file_bytes)) as pl_doc:
            for page_idx, page in enumerate(doc):
                pl_page = pl_doc.pages[page_idx]
                width, height = page.rect.width, page.rect.height
                
                # 1. Extract Tables
                tables = []
                pl_tables = pl_page.find_tables()
                table_bboxes = []
                
                for pl_table in pl_tables:
                    # pdfplumber bbox is (x0, top, x1, bottom)
                    bbox = pl_table.bbox
                    table_bboxes.append(bbox)
                    rows = pl_table.extract()
                    tables.append(TableBlock(bbox=bbox, rows=rows))

                # 2. Extract Spans (excluding text inside tables)
                spans = []
                blocks = page.get_text("dict")["blocks"]
                
                for block in blocks:
                    if block["type"] == 0:  # text
                        for line in block["lines"]:
                            for span in line["spans"]:
                                s_bbox = span["bbox"]
                                # We no longer skip table text because the reconstructor handles absolute positioning
                                # if is_in_table: continue

                                # Bit mask check for bold/italic in PyMuPDF
                                # flags bit 1: italic, bit 4: bold
                                flags = span["flags"]
                                is_italic = bool(flags & 2)
                                is_bold = bool(flags & 16)
                                
                                # Convert int color to RGB tuple
                                c = span["color"]
                                r = (c >> 16 & 255) / 255
                                g = (c >> 8 & 255) / 255
                                b = (c & 255) / 255

                                spans.append(TextSpan(
                                    text=span["text"],
                                    bbox=s_bbox,
                                    size=span["size"],
                                    font=span["font"],
                                    is_bold=is_bold,
                                    is_italic=is_italic,
                                    color=(r, g, b)
                                ))

                # 3. Extract Images
                images = []
                image_list = page.get_images(full=True)
                for img_info in image_list:
                    xref = img_info[0]
                    bbox = page.get_image_bbox(img_info)
                    base_image = doc.extract_image(xref)
                    images.append(ImageBlock(
                        bbox=bbox,
                        xref=xref,
                        image_bytes=base_image["image"],
                        ext=base_image["ext"]
                    ))

                pages_data.append(PageData(
                    width=width,
                    height=height,
                    spans=spans,
                    images=images,
                    tables=tables
                ))
        
        return pages_data
