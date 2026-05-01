"""Request and response models."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Translation Models
class TranslationRequest(BaseModel):
    """Request model for translation."""
    text: str = Field(..., min_length=1, max_length=10000)
    source_language: str = Field(..., description="Source language code: en, ne, tam")
    target_language: str = Field(..., description="Target language code: en, ne, tam")
    preserve_formatting: bool = False
    include_confidence: bool = False


class BatchTranslationRequest(BaseModel):
    """Request model for batch translation."""
    texts: list[str] = Field(..., min_length=1)
    source_language: str = Field(..., description="Source language code: en, ne, tam")
    target_language: str = Field(..., description="Target language code: en, ne, tam")


class TranslationResponse(BaseModel):
    """Response model for translation."""
    translated_text: str
    source_language: str
    target_language: str
    confidence_score: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# File Translation Models
class FileTranslationRequest(BaseModel):
    """Request model for file translation."""
    file_name: str
    source_language: str
    target_language: str
    file_type: str  # pdf, docx, txt, etc.


class FileTranslationResponse(BaseModel):
    """Response model for file translation."""
    file_id: str
    original_file_name: str
    translated_file_name: str
    status: str  # pending, processing, completed, failed
    progress: int = 0


# OCR Models
class OCRRequest(BaseModel):
    """Request model for OCR."""
    image_url: Optional[str] = None
    source_language: str
    target_language: Optional[str] = None
    perform_translation: bool = True


class BoundingBox(BaseModel):
    """Bounding box for text region."""
    x: float
    y: float
    width: float
    height: float
    confidence: float


class OCRResult(BaseModel):
    """OCR result with bounding boxes."""
    text: str
    bounding_box: BoundingBox
    confidence: float


class OCRResponse(BaseModel):
    """Response model for OCR."""
    results: list[OCRResult]
    translations: Optional[list[str]] = None


# Speech Models
class ASRRequest(BaseModel):
    """Request model for automatic speech recognition."""
    audio_url: str
    language: str
    output_format: str = "text"  # text, srt, vtt


class TTSRequest(BaseModel):
    """Request model for text-to-speech."""
    text: str
    language: str
    voice_id: Optional[str] = None
    speed: float = 1.0
    pitch: float = 1.0


# YouTube Models
class YouTubeRequest(BaseModel):
    """Request model for YouTube subtitle translation."""
    video_id: str
    source_language: str
    target_language: str
    export_format: str = "srt"  # srt, vtt, json


# PII Models
class PIIDetectionRequest(BaseModel):
    """Request model for PII detection."""
    text: str
    remove_pii: bool = False


class PIIEntity(BaseModel):
    """PII entity with details."""
    entity_type: str  # email, phone, ssn, credit_card, etc.
    value: str
    start_pos: int
    end_pos: int
    confidence: float


class PIIDetectionResponse(BaseModel):
    """Response model for PII detection."""
    original_text: str
    redacted_text: Optional[str] = None
    entities_found: list[PIIEntity]


# Knowledge Graph Models
class ConceptNode(BaseModel):
    """Concept node in knowledge graph."""
    id: str
    label: str
    language: str
    definition: Optional[str] = None


class Relationship(BaseModel):
    """Relationship between concepts."""
    source_id: str
    target_id: str
    relationship_type: str  # synonym, related, translation, etc.
    confidence: float


class KnowledgeGraphRequest(BaseModel):
    """Request model for knowledge graph operations."""
    concepts: list[str]
    language: str


class KnowledgeGraphResponse(BaseModel):
    """Response model for knowledge graph."""
    nodes: list[ConceptNode]
    relationships: list[Relationship]


# Glossary Models
class GlossaryEntry(BaseModel):
    """Glossary entry."""
    source_term: str
    source_language: str
    target_term: str
    target_language: str
    part_of_speech: Optional[str] = None
    context: Optional[str] = None


class GlossaryRequest(BaseModel):
    """Request model for glossary operations."""
    term: str
    language: str


class GlossaryResponse(BaseModel):
    """Response model for glossary."""
    entries: list[GlossaryEntry]


# Health Check Models
class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    version: str
    database: str
    cache: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
