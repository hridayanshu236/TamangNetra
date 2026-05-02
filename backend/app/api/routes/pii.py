"""Routes for PII detection endpoints."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import PIIDetectionRequest, PIIDetectionResponse, PIIEntity
from app.utils.pii_detector import PIIDetector

router = APIRouter(prefix="/pii", tags=["PII Detection"])


@router.post("/detect")
async def detect_pii(request: PIIDetectionRequest):
    """Detect personally identifiable information in text.
    
    - **text**: Text to analyze for PII
    """
    try:
        matches = PIIDetector.detect(request.text)
        entities = [
            PIIEntity(
                entity_type=match.entity_type,
                value=match.value,
                start_pos=match.start_pos,
                end_pos=match.end_pos,
                confidence=match.confidence
            )
            for match in matches
        ]
        
        redacted_text = None
        if request.remove_pii:
            redacted_text, _ = PIIDetector.redact(request.text)
        
        return PIIDetectionResponse(
            original_text=request.text,
            redacted_text=redacted_text,
            entities_found=entities
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/redact")
async def redact_pii(
    text: str,
    replacement: str = "[REDACTED]"
):
    """Redact PII from text.
    
    - **text**: Text to redact
    - **replacement**: Replacement string for PII
    """
    try:
        redacted, matches = PIIDetector.redact(text, replacement)
        return {
            "original": text,
            "redacted": redacted,
            "pii_count": len(matches)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-score")
async def calculate_risk_score(text: str):
    """Calculate PII risk score for text.
    
    - **text**: Text to analyze
    """
    try:
        score = PIIDetector.risk_score(text)
        return {
            "text": text,
            "risk_score": score,
            "risk_level": "high" if score > 0.7 else "medium" if score > 0.3 else "low"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
