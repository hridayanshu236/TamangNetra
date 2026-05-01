"""PII (Personally Identifiable Information) detection utilities."""
import re
from typing import Optional, Tuple
from dataclasses import dataclass


@dataclass
class PIIMatch:
    """Represents a matched PII entity."""
    entity_type: str
    value: str
    start_pos: int
    end_pos: int
    confidence: float


class PIIDetector:
    """Service for detecting personally identifiable information."""
    
    # Regex patterns for common PII
    PATTERNS = {
        "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        "phone": re.compile(r'\b(?:\+\d{1,3}[-.\s]?)?\(?(?:\d{3})\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
        "ssn": re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
        "credit_card": re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
        "passport": re.compile(r'\b[A-Z]{1,2}\d{6,9}\b'),
        "ip_address": re.compile(
            r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
            r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        ),
        "url": re.compile(r'https?://[^\s]+'),
    }
    
    # Keywords that may indicate sensitive information
    SENSITIVE_KEYWORDS = [
        "password", "secret", "token", "api_key", "auth",
        "credit", "social", "security", "ssn", "pan"
    ]
    
    @classmethod
    def detect(cls, text: str) -> list[PIIMatch]:
        """Detect PII entities in text.
        
        Args:
            text: Text to analyze
            
        Returns:
            List of detected PII matches
        """
        matches = []
        
        for entity_type, pattern in cls.PATTERNS.items():
            for match in pattern.finditer(text):
                matches.append(PIIMatch(
                    entity_type=entity_type,
                    value=match.group(),
                    start_pos=match.start(),
                    end_pos=match.end(),
                    confidence=0.9  # Regex-based, high confidence
                ))
        
        return sorted(matches, key=lambda m: m.start_pos)
    
    @classmethod
    def redact(cls, text: str, replacement: str = "[REDACTED]") -> Tuple[str, list[PIIMatch]]:
        """Redact PII entities from text.
        
        Args:
            text: Text to redact
            replacement: Replacement string for PII
            
        Returns:
            Tuple of (redacted_text, list of detected matches)
        """
        matches = cls.detect(text)
        
        if not matches:
            return text, matches
        
        # Process matches in reverse order to maintain positions
        redacted = text
        for match in reversed(matches):
            redacted = redacted[:match.start_pos] + replacement + redacted[match.end_pos:]
        
        return redacted, matches
    
    @classmethod
    def has_sensitive_keywords(cls, text: str) -> bool:
        """Check if text contains sensitive keywords.
        
        Args:
            text: Text to check
            
        Returns:
            True if sensitive keywords found
        """
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in cls.SENSITIVE_KEYWORDS)
    
    @classmethod
    def risk_score(cls, text: str) -> float:
        """Calculate PII risk score (0.0 to 1.0).
        
        Args:
            text: Text to analyze
            
        Returns:
            Risk score
        """
        matches = cls.detect(text)
        has_keywords = cls.has_sensitive_keywords(text)
        
        # Base score on number and type of matches
        score = min(len(matches) * 0.2, 0.8)
        
        if has_keywords:
            score += 0.2
        
        return min(score, 1.0)


def get_pii_detector() -> type[PIIDetector]:
    """Factory function to get PII detector class."""
    return PIIDetector
