from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from lib.pii import scrub as pii_scrub, restore as pii_restore

router = APIRouter(prefix="/api/v1", tags=["pii"])

class ScrubRequest(BaseModel):
    text: str

class ScrubResponse(BaseModel):
    sanitized_text: str
    mapping: Dict[str, str]

class RestoreRequest(BaseModel):
    sanitized_text: str
    mapping: Dict[str, str]

class RestoreResponse(BaseModel):
    restored_text: str

@router.post("/scrub", response_model=ScrubResponse)
def scrub_text(req: ScrubRequest):
    sanitized_text, mapping = pii_scrub(req.text)
    return ScrubResponse(sanitized_text=sanitized_text, mapping=mapping)

@router.post("/restore", response_model=RestoreResponse)
def restore_text(req: RestoreRequest):
    restored_text = pii_restore(req.sanitized_text, req.mapping)
    return RestoreResponse(restored_text=restored_text)
