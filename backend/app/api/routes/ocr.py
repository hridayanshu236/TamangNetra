"""Routes for OCR and image processing endpoints."""
from fastapi import APIRouter, Body, Depends, HTTPException
from app.models.schemas import OCRRequest, OCRResponse
from app.services.ocr import OCRService, get_ocr_service

router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("/process", response_model=OCRResponse)
async def process_ocr(
    request: OCRRequest,
    service: OCRService = Depends(get_ocr_service)
):
    """Process image for optical character recognition.
    
    - **image_url**: URL of the image to process
    - **source_language**: Language to extract
    - **target_language**: Language to translate to (optional)
    - **perform_translation**: Whether to translate extracted text
    """
    try:
        return await service.process_image(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-regions")
async def detect_text_regions(
    image_url: str = Body(..., embed=True),
    service: OCRService = Depends(get_ocr_service)
):
    """Detect text regions in an image.
    
    - **image_url**: URL of the image
    """
    try:
        regions = await service.detect_text_regions(image_url)
        return {"regions": regions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
