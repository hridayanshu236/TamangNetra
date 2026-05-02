# 🛠️ TamangNetra: Developer & Team Guide

Welcome to the TamangNetra development team! This document outlines the technical architecture, pipeline logic, and internal structures of the project.

## 🏗️ Project Structure

```text
TamangNetra/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── api/            # API Routes (Document, Health, YouTube)
│   │   ├── services/       # Core Logic (Document Processing, Translation)
│   │   └── main.py         # App Entry Point
│   ├── knowledge_graph_cache.json # Persistent sentence-level cache
│   └── requirements.txt
└── frontend/               # Next.js Application (App Router)
    ├── src/
    │   ├── components/     # UI Components (TamangNetra Design System)
    │   └── lib/            # Utilities
    └── app/                # Pages and API Routes
```

## ⚙️ Core Pipeline Logic

### 1. The Translation Engine (`translation.py`)
- **Concurrency**: Uses `asyncio.Semaphore(20)` to handle high-volume batch requests without hitting API rate limits.
- **Caching**: All translations are stored in `knowledge_graph_cache.json`. The key is a normalized string of `Text|||SourceLang|||TargetLang`.
- **Normalization**: Text is cleaned before lookup to maximize cache hit rates across different document formats.

### 2. Document Reconstruction (`document.py`)
This is the most critical part of the system. We don't just extract text; we reconstruct the file.
- **PDF**: Uses `PyMuPDF`. 
  - **Extraction**: Page-level extraction to match the sentence-based cache.
  - **Redaction**: Uses `apply_redactions(images=PDF_REDACT_IMAGE_NONE)` to keep images while removing text.
  - **Insertion**: Uses `insert_textbox` with custom font embedding (`Noto Sans Devanagari`) to handle Devanagari script correctly.
- **DOCX**: Uses `python-docx`. Operates at the **Run** level. This is vital to preserve bold, italic, and color properties within a single paragraph.

### 3. Frontend Architecture
- **State Management**: React `useState` and `useEffect` handle the complex upload and progress states.
- **Progress Streaming**: The backend uses `StreamingResponse` (NDJSON) to send real-time progress updates (e.g., "Extracting text", "50% complete").
- **Design System**: Vanilla CSS with a focus on premium glassmorphism and smooth animations.

## 📝 Key Features for Maintenance

- **Cache Management**: The `knowledge_graph_cache.json` grows over time. If translations are incorrect, you can manually edit this file to fix the "Knowledge Graph".
- **OCR Integration**: Uses `pytesseract`. If images aren't being translated, ensure Tesseract is installed on the host machine.
- **Font Embedding**: The Devanagari font is downloaded once per session and cached in memory to avoid redundant network calls.

## 🤝 Internal Workflow
- **Adding new languages**: Update the language list in `frontend/app/page.tsx` and ensure the TMT API supports the new pair.
- **UI Tweaks**: Most styles are in the CSS files within `frontend/src/components`.

---
*For internal team use only.*
