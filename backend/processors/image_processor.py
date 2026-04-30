from paddleocr import PaddleOCR
import base64, io
from PIL import Image
import numpy as np

ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

async def translate_image_regions(image_b64: str, src: str, tgt: str, translator,
                                   pen_bbox: dict = None):
    """
    pen_bbox: optional {x, y, w, h} in pixel coords from pen tool.
    Returns list of {box: [[x,y]x4], original: str, translated: str}
    """
    img_bytes = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img_np = np.array(img)

    result = ocr_engine.ocr(img_np, cls=True)
    regions = []

    for line in (result[0] or []):
        box, (text, confidence) = line
        if confidence < 0.6 or not text.strip():
            continue

        # If pen bbox provided, only process regions inside it
        if pen_bbox:
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            if (min(xs) < pen_bbox["x"] or max(xs) > pen_bbox["x"] + pen_bbox["w"] or
                min(ys) < pen_bbox["y"] or max(ys) > pen_bbox["y"] + pen_bbox["h"]):
                continue

        translated = await translator.translate(text, src, tgt)
        regions.append({
            "box": box,          # 4 corner points [[x,y], [x,y], [x,y], [x,y]]
            "original": text,
            "translated": translated,
            "confidence": round(confidence, 2)
        })

    return regions