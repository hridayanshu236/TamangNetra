from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Dict, Optional
from lib.translator import get_translator

router = APIRouter(prefix="/api/v1", tags=["translate"])
translator = get_translator()

class TranslateRequest(BaseModel):
    text: str
    source: str
    target: str
    glossary: Optional[Dict] = None

@router.post("/translate")
async def translate_text(req: TranslateRequest, validate: bool = Query(True)):
    return await translator.translate(
        text=req.text,
        source=req.source,
        target=req.target,
        glossary=req.glossary
    )
