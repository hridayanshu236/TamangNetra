from fastapi import APIRouter, Header, Path
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid
import json
import redis
import os

from lib.crypto import encrypt, decrypt
from lib.pii import scrub, restore
from lib.glossary import build_glossary
from lib.sentence_splitter import split_sentences, assemble_segments
from lib.translator import get_translator
from lib.validator import detect_zones, similarity

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])
translator = get_translator()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    r = redis.Redis.from_url(redis_url, decode_responses=True)
    r.ping()
except Exception:
    r = None

JOB_STORE = {}

class JobOptions(BaseModel):
    validate: bool = False
    targetLangs: List[str] = ["NP", "TM"]

class JobRequest(BaseModel):
    encryptedPayload: str
    iv: str
    salt: str
    contentType: str
    filename: Optional[str] = None
    options: JobOptions = JobOptions()

@router.post("")
async def create_job(req: JobRequest, x_password: str = Header(...)):
    job_id = str(uuid.uuid4())
    
    if req.contentType != "text":
        # TODO: wire up PDF/Image/CSV extraction engines in integration step
        return {"jobId": job_id, "status": "pending"}
        
    try:
        # 1. decrypt
        plain_text = decrypt(req.encryptedPayload, req.iv, req.salt, x_password)
        
        # 2. scrub
        clean_text, pii_map = scrub(plain_text)
        
        # 3. build glossary
        glossary = build_glossary(clean_text)
        
        # 4. translate
        translations = {}
        segments_dict = {}
        
        for target in req.options.targetLangs:
            result = await translator.translate(clean_text, "EN", target, glossary)
            translations[target] = result["translation"]
            segments_dict[target] = result.get("segments", [])
            
        # 5. validation
        back_translated = None
        drift_score = None
        risk_zones = []
        
        if req.options.validate and "TM" in translations:
            back_result = await translator.translate(translations["TM"], "TM", "EN", glossary)
            back_translated = back_result["translation"]
            risk_zones = detect_zones(clean_text, back_translated)
            drift_score = similarity(clean_text, back_translated)
                
        # 6. restore PII
        for lang in translations:
            translations[lang] = restore(translations[lang], pii_map)
            
        if back_translated:
            back_translated = restore(back_translated, pii_map)
            
        # 7. Build JobResult
        job_result = {
            "originalText": plain_text,
            "translations": translations,
            "riskZones": risk_zones,
            "glossary": glossary,
            "piiMapping": pii_map,
        }
        
        if back_translated is not None:
            job_result["backTranslated"] = back_translated
        if drift_score is not None:
            job_result["driftScore"] = drift_score
            
        # 8. Encrypt
        result_json = json.dumps(job_result)
        encrypted_result = encrypt(result_json, x_password)
        
        # 9. Store
        encrypted_blob = json.dumps(encrypted_result)
        if r:
            r.setex(f"job:{job_id}", 3600, encrypted_blob)
        else:
            JOB_STORE[f"job:{job_id}"] = encrypted_blob
            
        # 10. Return
        return {"jobId": job_id, "status": "completed", "result": encrypted_result}
        
    except Exception as e:
        return {"jobId": job_id, "status": "failed", "error": str(e)}

@router.get("/{job_id}")
async def get_job(job_id: str = Path(...)):
    res = None
    if r:
        res = r.get(f"job:{job_id}")
    else:
        res = JOB_STORE.get(f"job:{job_id}")
        
    if not res:
        return {"jobId": job_id, "status": "failed", "error": "Job not found"}
        
    enc_res = json.loads(res)
    return {"jobId": job_id, "status": "completed", "result": enc_res}
