import io
import logging
from paddleocr import PaddleOCR as PaddleEngine
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

class OcrHandler:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OcrHandler, cls).__new__(cls)
            # Initialize PaddleOCR (lang='hi' for Devanagari support)
            logger.info("Initializing PaddleOCR Engine...")
            cls._instance.engine = PaddleEngine(use_angle_cls=True, lang='hi')
            logger.info("PaddleOCR Engine ready.")
        return cls._instance

    def extract_text_from_image(self, image_bytes: bytes) -> list:
        """
        Runs OCR and returns list of dicts with text and relative bboxes.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            img_array = np.array(img)
            result = self.engine.ocr(img_array)
            
            extracted = []
            if result and result[0]:
                for line in result[0]:
                    # line structure: [[ [x,y],[x,y],[x,y],[x,y] ], ("text", confidence)]
                    points = line[0]
                    text = line[1][0]
                    
                    # Get simple bbox from points
                    x_coords = [p[0] for p in points]
                    y_coords = [p[1] for p in points]
                    bbox = (min(x_coords), min(y_coords), max(x_coords), max(y_coords))
                    
                    extracted.append({
                        "text": text,
                        "bbox": bbox
                    })
            return extracted
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return []
