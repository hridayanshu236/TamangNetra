"""Conftest for pytest configuration."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Provide FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_translation_request():
    """Provide sample translation request."""
    return {
        "text": "Hello, how are you?",
        "source_language": "en",
        "target_language": "ne"
    }
