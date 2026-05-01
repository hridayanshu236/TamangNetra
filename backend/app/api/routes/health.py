"""Routes for health check and system endpoints."""
from fastapi import APIRouter, Depends
from app.models.schemas import HealthCheck
from app.core.config import get_settings

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthCheck)
async def health_check(settings = Depends(get_settings)):
    """Check API health status."""
    # Placeholder: In production, check database and cache connectivity
    return HealthCheck(
        status="healthy",
        version="0.1.0",
        database="connected",
        cache="connected"
    )


@router.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "TamangNetra API",
        "version": "0.1.0",
        "description": "Trilingual translation backend",
        "documentation": "/docs",
        "openapi": "/openapi.json"
    }
