"""Tests for PII detection utilities."""
import pytest
from app.utils.pii_detector import PIIDetector


def test_detect_email():
    """Test email detection."""
    text = "Contact me at john.doe@example.com for more info"
    matches = PIIDetector.detect(text)
    
    assert len(matches) > 0
    email_match = next((m for m in matches if m.entity_type == "email"), None)
    assert email_match is not None
    assert email_match.value == "john.doe@example.com"


def test_detect_phone():
    """Test phone number detection."""
    text = "Call me at (555) 123-4567"
    matches = PIIDetector.detect(text)
    
    assert len(matches) > 0
    phone_match = next((m for m in matches if m.entity_type == "phone"), None)
    assert phone_match is not None


def test_redact_pii():
    """Test PII redaction."""
    text = "Email: john.doe@example.com"
    redacted, matches = PIIDetector.redact(text)
    
    assert "john.doe@example.com" not in redacted
    assert "[REDACTED]" in redacted


def test_risk_score():
    """Test risk score calculation."""
    safe_text = "This is a normal sentence"
    risky_text = "Email: john@example.com, Phone: (555)123-4567"
    
    safe_score = PIIDetector.risk_score(safe_text)
    risky_score = PIIDetector.risk_score(risky_text)
    
    assert safe_score < risky_score
