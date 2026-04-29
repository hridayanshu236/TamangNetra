from fastapi import APIRouter, Header, HTTPException, Path
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uuid
import json
import redis
import os

from lib.crypto import decrypt, encrypt
from lib.pii import scrub, restore
from lib.glossary import build_glossary
from lib.translator import get_translator
from lib.validator import similarity, detect_zones

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])
translator = get_translator()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
r = redis.Redis.from_url(redis_url, decode_responses=True)

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
        # TODO: Process non-text content types
        return {"jobId": job_id, "status": "failed", "error": "Only text contentType is supported for now"}
        
    try:
        # 1. Decrypt payload
        original_text = decrypt(req.encryptedPayload, req.iv, req.salt, x_password)
        
        # 2. PII Scrub
        clean_text, mapping = scrub(original_text)
        
        # 3. Glossary Extraction
        glossary = build_glossary(clean_text)
        
        # 4. Translation
        translations = {}
        for lang in req.options.targetLangs:
            trans_res = await translator.translate(clean_text, "EN", lang, glossary)
            translations[lang] = trans_res["translation"]
            
        # 5. Validation
        back_translated = None
        drift_score = None
        risk_zones = []
        
        if req.options.validate:
            # Back-translate from TM or NP back to EN
            if "TM" in translations:
                bt_res = await translator.translate(translations["TM"], "TM", "EN", glossary)
                back_translated = bt_res["translation"]
            elif "NP" in translations:
                bt_res = await translator.translate(translations["NP"], "NP", "EN", glossary)
                back_translated = bt_res["translation"]
                
            if back_translated:
                risk_zones = detect_zones(clean_text, back_translated)
                drift_score = similarity(clean_text, back_translated)
                
        # 6. PII Restore
        final_translations = {}
        for lang, txt in translations.items():
            final_translations[lang] = restore(txt, mapping)
            
        if back_translated:
            back_translated = restore(back_translated, mapping)
            
        # 7. Build JobResult dictionary
        job_result = {
            "originalText": original_text,
            "translations": final_translations,
            "riskZones": risk_zones,
            "glossary": glossary,
            "piiMapping": mapping
        }
        
        if back_translated is not None:
            job_result["backTranslated"] = back_translated
        if drift_score is not None:
            job_result["driftScore"] = drift_score
            
        # 8. Encrypt the result JSON
        result_json = json.dumps(job_result)
        enc_res = encrypt(result_json, x_password)
        
        # 9. Store in Redis
        encrypted_result_blob = json.dumps(enc_res)
        r.setex(f"job:{job_id}", 3600, encrypted_result_blob)
        
        # 10. Return job info
        return {"jobId": job_id, "status": "completed", "result": enc_res}
        
    except Exception as e:
        return {"jobId": job_id, "status": "failed", "error": str(e)}

@router.get("/{job_id}")
def get_job(job_id: str = Path(...)):
    res = r.get(f"job:{job_id}")
    if not res:
        return {"jobId": job_id, "status": "failed", "error": "Job not found"}
        
    enc_res = json.loads(res)
    return {"jobId": job_id, "status": "completed", "result": enc_res}
