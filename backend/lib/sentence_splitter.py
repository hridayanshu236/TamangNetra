import re
from typing import List, Dict

def split_sentences(text: str) -> List[Dict]:
    """
    Splits text into sentences.
    Returns a list of dictionaries with keys: id, text, preserve_as_is.
    """
    if not text:
        return []
        
    # Split on sentence boundaries (., !, ?)
    # This is a naive regex-based splitter
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    segments = []
    for i, s in enumerate(sentences):
        if s:
            segments.append({
                "id": i,
                "text": s,
                "preserve_as_is": False
            })
    return segments

def assemble_segments(segments: List[Dict]) -> str:
    """
    Assembles a string from a list of segment dictionaries.
    Assumes segments have a 'translated' key.
    """
    return " ".join([seg.get("translated", "") for seg in segments])
