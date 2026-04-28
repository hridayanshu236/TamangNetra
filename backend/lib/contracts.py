from typing import Protocol, Dict, List, Tuple, Any
from pydantic import BaseModel

class TextBlock(BaseModel):
    text: str
    x: float
    y: float
    width: float
    height: float
    font: str
    size: float
    page: int

class OcrRegion(BaseModel):
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float

class Translator(Protocol):
    """Mock or real TMT translator must implement this."""
    async def translate(self, text: str, source: str, target: str, glossary: Dict = None) -> Dict[str, Any]: ...

class PdfEngine(Protocol):
    def extract(self, file_bytes: bytes) -> List[TextBlock]: ...
    def reconstruct(self, blocks: List[TextBlock], translations: Dict[int, str]) -> bytes: ...

class OcrEngine(Protocol):
    def ocr(self, image_bytes: bytes) -> List[OcrRegion]: ...

class CsvEngine(Protocol):
    def translate_file(self, file_bytes: bytes, filename: str, translator: Translator) -> bytes: ...