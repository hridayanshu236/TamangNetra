"""Routes for translation endpoints."""
from fastapi import APIRouter, Body, Depends, HTTPException
from app.models.schemas import BatchTranslationRequest, TranslationRequest, TranslationResponse
from app.services.translation import TranslationService, get_translation_service

router = APIRouter(prefix="/translate", tags=["Translation"])


@router.post("/", response_model=TranslationResponse)
async def translate(
    request: TranslationRequest,
    service: TranslationService = Depends(get_translation_service)
):
    """Translate text between languages.
    
    - **text**: Text to translate (1-10000 characters)
    - **source_language**: Source language code (en, ne, tam)
    - **target_language**: Target language code (en, ne, tam)
    """
    try:
        return await service.translate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def batch_translate(
    request: BatchTranslationRequest,
    service: TranslationService = Depends(get_translation_service)
):
    """Translate multiple texts in a single request.
    
    - **texts**: List of texts to translate
    - **source_language**: Source language code
    - **target_language**: Target language code
    """
    try:
        results = await service.batch_translate(
            request.texts,
            request.source_language,
            request.target_language,
        )
        return {"translations": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
