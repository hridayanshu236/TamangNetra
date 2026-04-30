import re

class TermGlossary:
    def __init__(self):
        self.cache: dict[str, str] = {}

    def extract_terms(self, text: str) -> list[str]:
        # Capitalized multi-word phrases = proper nouns / technical terms
        return re.findall(r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b', text)

    def learn(self, original: str, translated: str):
        self.cache[original] = translated

    def apply(self, sentence: str) -> tuple[str, dict]:
        """Replace known terms with placeholders before API call"""
        placeholders = {}
        result = sentence
        for orig, trans in self.cache.items():
            if orig in result:
                ph = f"TERM{len(placeholders)}"
                result = result.replace(orig, ph)
                placeholders[ph] = trans
        return result, placeholders

    def restore(self, translated: str, placeholders: dict) -> str:
        for ph, trans in placeholders.items():
            translated = translated.replace(ph, trans)
        return translated