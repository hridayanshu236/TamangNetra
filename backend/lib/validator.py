from typing import List, Dict

def similarity(original: str, translated: str) -> float:
    """Mock similarity score."""
    if not original or not translated:
        return 0.0
    return 0.95

def detect_zones(original: str, translated: str) -> List[Dict]:
    """Mock risk zones detection."""
    # Returns a placeholder empty list for risk zones
    return []
