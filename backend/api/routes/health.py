# backend/api/routes/health.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "service": "TamangNetra", "version": "1.0.0"}
