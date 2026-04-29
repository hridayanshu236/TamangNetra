from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import io
from typing import Dict
from lib.pdf_engine import PdfEngine
from lib.translator import get_translator
import json

router = APIRouter(prefix="/api/v1/pdf", tags=["pdf"])
engine = PdfEngine()
translator = get_translator()

@router.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    blocks = engine.extract(contents)
    return {"blocks": [b.__dict__ for b in blocks]}

@router.post("/translate")
async def translate_pdf(file: UploadFile = File(...), target: str = Form("NP")):
    contents = await file.read()
    blocks, full_text = engine.get_full_text(contents)
    
    translations = {}
    for b in blocks:
        # Assuming simple EN to target translation here
        res = await translator.translate(b.text, "EN", target)
        translations[b.id] = res["translation"]
        
    out_pdf = engine.reconstruct(blocks, translations, target)
    
    return StreamingResponse(
        io.BytesIO(out_pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=translated_{file.filename}"}
    )
