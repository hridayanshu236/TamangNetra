import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class HighFidelityPdfReconstructor:
    def __init__(self, font_regular_path: str):
        self.font_path = font_regular_path

    def html_to_pdf(self, html_content: str) -> bytes:
        """
        Convert translated HTML to a visually accurate PDF using WeasyPrint.
        """
        try:
            from weasyprint import HTML, CSS
            from weasyprint.text.fonts import FontConfiguration
            
            # Add @font-face for Devanagari support
            font_css = f"""
                @font-face {{
                    font-family: 'Noto Sans Devanagari';
                    src: url(file://{self.font_path});
                }}
                body {{
                    font-family: 'Noto Sans Devanagari', serif;
                }}
            """
            
            font_config = FontConfiguration()
            html = HTML(string=html_content)
            css = CSS(string=font_css)
            
            pdf_bytes = html.write_pdf(
                stylesheets=[css],
                font_config=font_config
            )
            return pdf_bytes
        except ImportError as e:
            logger.error(f"WeasyPrint not installed or missing system deps: {e}")
            raise RuntimeError("WeasyPrint is not available on this system.")
        except Exception as e:
            logger.error(f"WeasyPrint reconstruction failed: {e}")
            raise e
