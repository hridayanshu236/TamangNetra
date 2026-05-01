"""Encryption utilities for PII and sensitive data."""
from cryptography.fernet import Fernet
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2
import base64
import binascii
import hashlib
from typing import Optional


class EncryptionService:
    """Service for encryption/decryption of sensitive data."""
    
    def __init__(self, key: str):
        """Initialize encryption service.
        
        Args:
            key: Encryption key (256-bit hex string or base64)
        """
        try:
            # Try to convert hex to bytes
            if len(key) == 64:  # 256-bit hex
                self.key = bytes.fromhex(key)
            else:
                # Assume base64
                self.key = base64.b64decode(key)
        except (ValueError, binascii.Error):
            # Derive key from password using PBKDF2
            self.key = PBKDF2(key, b'salt', dkLen=32, count=100000)
    
    def encrypt_aes256(self, plaintext: str) -> str:
        """Encrypt using AES-256-GCM.
        
        Args:
            plaintext: Text to encrypt
            
        Returns:
            Base64 encoded ciphertext with nonce and tag
        """
        nonce = get_random_bytes(12)
        cipher = AES.new(self.key, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode())
        
        # Combine nonce + tag + ciphertext
        encrypted = nonce + tag + ciphertext
        return base64.b64encode(encrypted).decode()
    
    def decrypt_aes256(self, encrypted: str) -> str:
        """Decrypt AES-256-GCM ciphertext.
        
        Args:
            encrypted: Base64 encoded encrypted data
            
        Returns:
            Decrypted plaintext
        """
        encrypted_bytes = base64.b64decode(encrypted)
        
        # Extract components
        nonce = encrypted_bytes[:12]
        tag = encrypted_bytes[12:28]
        ciphertext = encrypted_bytes[28:]
        
        cipher = AES.new(self.key, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        
        return plaintext.decode()
    
    def hash_sha256(self, text: str) -> str:
        """Create SHA-256 hash of text.
        
        Args:
            text: Text to hash
            
        Returns:
            Hex encoded hash
        """
        return hashlib.sha256(text.encode()).hexdigest()
    
    def mask_sensitive(self, text: str, entity_type: str) -> str:
        """Mask sensitive data based on entity type.
        
        Args:
            text: Text to mask
            entity_type: Type of entity (email, phone, ssn, etc.)
            
        Returns:
            Masked text
        """
        if entity_type == "email":
            parts = text.split("@")
            if len(parts) == 2:
                return f"{parts[0][0]}***@{parts[1]}"
        elif entity_type == "phone":
            return text[:3] + "****" + text[-4:]
        elif entity_type == "ssn":
            return "***-**-" + text[-4:]
        elif entity_type == "credit_card":
            return "****-****-****-" + text[-4:]
        
        # Default: mask everything except first and last char
        if len(text) <= 2:
            return "*" * len(text)
        return text[0] + "*" * (len(text) - 2) + text[-1]


def get_encryption_service(key: str) -> EncryptionService:
    """Factory function to create encryption service."""
    return EncryptionService(key)
