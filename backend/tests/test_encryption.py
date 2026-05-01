"""Tests for encryption utilities."""
import pytest
from app.utils.encryption import EncryptionService


def test_encryption_decryption():
    """Test AES-256 encryption and decryption."""
    key = "0" * 64  # 256-bit hex key
    service = EncryptionService(key)
    
    plaintext = "Sensitive data"
    encrypted = service.encrypt_aes256(plaintext)
    decrypted = service.decrypt_aes256(encrypted)
    
    assert decrypted == plaintext
    assert encrypted != plaintext


def test_hash_sha256():
    """Test SHA-256 hashing."""
    service = EncryptionService("0" * 64)
    
    text = "password123"
    hash1 = service.hash_sha256(text)
    hash2 = service.hash_sha256(text)
    
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex output


def test_mask_sensitive():
    """Test sensitive data masking."""
    service = EncryptionService("0" * 64)
    
    email = "john.doe@example.com"
    masked = service.mask_sensitive(email, "email")
    
    assert "john.doe@example.com" not in masked
    assert "@example.com" in masked
