from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TaMAMAgang API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    from lib.crypto import encrypt, decrypt

    password = "demo123"
    plaintext = "tamamagang"

    enc = encrypt(plaintext, password)
    dec = decrypt(enc["ciphertext"], enc["iv"], enc["salt"], password)

    if dec == plaintext:
        return {"status": "ok", "roundtrip": dec}

    return {"status": "fail", "roundtrip": dec}