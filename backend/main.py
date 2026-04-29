from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import scrub, translate, jobs, pdf

app = FastAPI(title="TamangNetra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scrub.router)
app.include_router(translate.router)
app.include_router(jobs.router)
app.include_router(pdf.router)

@app.get("/health")
def health():
    from lib.crypto import encrypt, decrypt

    password = "demo123"
    plaintext = "tamangnetra"

    enc = encrypt(plaintext, password)
    dec = decrypt(enc["ciphertext"], enc["iv"], enc["salt"], password)

    if dec == plaintext:
        return {"status": "ok", "roundtrip": dec}

    return {"status": "fail", "roundtrip": dec}