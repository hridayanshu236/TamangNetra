import logging

logger = logging.getLogger(__name__)

class OcrHandler:
    """
    Temporarily disabled due to environment-specific PaddleOCR initialization errors.
    The High-Fidelity pipeline handles most math/layout without needing OCR.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OcrHandler, cls).__new__(cls)
            cls._instance.engine = None
            logger.warning("OcrHandler initialized in dummy mode (PaddleOCR disabled).")
        return cls._instance

    def extract_text_from_image(self, image_bytes: bytes) -> list:
        return []
