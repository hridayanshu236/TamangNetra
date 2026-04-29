"""
AES-256-CBC encryption helpers using pycryptodome.

Key derivation: PBKDF2-HMAC-SHA256, 100 000 iterations, random 16-byte salt.
Cipher:        AES-256-CBC with random 16-byte IV, PKCS#7 padding.
"""

import base64
import os

from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256, HMAC
from Crypto.Util.Padding import pad, unpad


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_KEY_LEN = 32          # 256-bit key
_IV_LEN = 16           # AES block size
_SALT_LEN = 16
_ITERATIONS = 100_000


def _derive_key(password: str, salt: bytes) -> bytes:
    """Derive a 32-byte key from *password* + *salt* via PBKDF2-HMAC-SHA256."""
    return PBKDF2(
        password,
        salt,
        dkLen=_KEY_LEN,
        count=_ITERATIONS,
        prf=lambda p, s: HMAC.new(p, s, SHA256).digest(),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encrypt(plaintext: str, password: str) -> dict:
    """Encrypt *plaintext* with AES-256-CBC.

    Returns
    -------
    dict
        ``{"ciphertext": <b64>, "iv": <b64>, "salt": <b64>}``
    """
    salt = os.urandom(_SALT_LEN)
    iv = os.urandom(_IV_LEN)
    key = _derive_key(password, salt)

    cipher = AES.new(key, AES.MODE_CBC, iv)
    ct_bytes = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))

    return {
        "ciphertext": base64.b64encode(ct_bytes).decode("utf-8"),
        "iv": base64.b64encode(iv).decode("utf-8"),
        "salt": base64.b64encode(salt).decode("utf-8"),
    }


def decrypt(ciphertext: str, iv: str, salt: str, password: str) -> str:
    """Decrypt an AES-256-CBC payload produced by :func:`encrypt`.

    Parameters are the three base-64 strings plus the original password.
    """
    key = _derive_key(password, base64.b64decode(salt))
    cipher = AES.new(key, AES.MODE_CBC, base64.b64decode(iv))
    pt_bytes = unpad(cipher.decrypt(base64.b64decode(ciphertext)), AES.block_size)
    return pt_bytes.decode("utf-8")


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_plain = "tamangnetra"
    test_pass = "demo123"

    enc = encrypt(test_plain, test_pass)
    dec = decrypt(enc["ciphertext"], enc["iv"], enc["salt"], test_pass)

    if dec == test_plain:
        print(f"PASS  roundtrip ok — plaintext: {dec}")
    else:
        print(f"FAIL  expected {test_plain!r}, got {dec!r}")
