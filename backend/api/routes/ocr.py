from fastapi import APIRouter
from pydantic import BaseModel
from backend.processors.image_processor import translate_image_regions
from backend.services.translator import translator

router = APIRouter()

class OCRRequest(BaseModel):
    image_b64: str
    src_lang: str
    tgt_lang: str
    pen_bbox: dict = None  # {x, y, w, h}

@router.post("/ocr/translate")
async def ocr_translate(req: OCRRequest):
    regions = await translate_image_regions(
        req.image_b64, req.src_lang, req.tgt_lang, translator, req.pen_bbox)
    return {"regions": regions}