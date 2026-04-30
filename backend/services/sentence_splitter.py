import re, nltk
nltk.download("punkt_tab", quiet=True)
from nltk.tokenize import sent_tokenize

def split(text: str, lang: str = "en") -> list[str]:
    text = text.strip()
    if not text:
        return []
    normalized = lang.lower()
    if normalized in ("ne", "nep", "nepali", "tmg", "tamang"):
        # Split on Devanagari danda (।), double danda (॥), and period
        parts = re.split(r'[।॥.!?]+', text)
        return [p.strip() for p in parts if p.strip()]
    return sent_tokenize(text)