from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.api.routes import translate, youtube, ocr, health

app = FastAPI(title="TamangNetra API")

app.add_middleware(CORSMiddleware,
    allow_origins=[settings.frontend_url, "https://*.vercel.app"],
    allow_methods=["*"], allow_headers=["*"])

app.include_router(health.router)
app.include_router(translate.router)
app.include_router(youtube.router)
app.include_router(ocr.router)