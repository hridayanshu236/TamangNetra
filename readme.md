# TamangNetra

## Overview

TamangNetra is a translation pipeline with a React + Vite frontend and FastAPI backend.
It supports:
- text translation
- document translation for PDF, DOCX, CSV/TSV
- OCR image translation
- YouTube subtitle translation

## Backend Setup

1. Go to the project root (TamangNetra):
   ```bash
   cd TamangNetra
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Create the `.env` file in the `backend` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

5. Edit `backend/.env` and set the required values:
   ```bash
   TMT_TOKEN=your_actual_token_here
   FRONTEND_URL=http://localhost:5173
   ```

6. Run the backend server from the project root:
   ```bash
   cd ..
   uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend Setup

1. Go to the frontend folder from the project root:
   ```bash
   cd tamangnetra-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend dev server:
   ```bash
   npm run dev
   ```

4. (Optional) Add `VITE_API_BASE` to a `.env` file in `tamangnetra-frontend` if you need a custom backend URL:
   ```bash
   VITE_API_BASE=http://localhost:8000
   ```

## API Endpoints

- `POST /translate-text`
  - JSON body: `{ text, src_lang, tgt_lang }`
  - Response: `{ output }`

- `POST /translate-file`
  - Form data: `file`, `src_lang`, `tgt_lang`
  - Response: `{ filename, download_url, glossary }`

- `POST /ocr-translate`
  - JSON body: `{ image_b64, src_lang, tgt_lang, pen_bbox? }`

- `POST /youtube-translate`
  - JSON body: `{ url, src_lang, tgt_lang }`

- `GET /download/{job_id}/{filename}`
  - Downloads the translated file.

## Notes

- The frontend now uses Tailwind CSS for layout and styling.
- The backend is configured to allow requests from `http://localhost:5173`.
- The external translator is called with `Authorization: Bearer <TMT_TOKEN>`.
- Document translation supports PDF, DOCX, CSV, and TSV files.
- Image OCR translation accepts base64 images and optional bounding boxes.

## Running the App

**Terminal 1 (Backend):**
```bash
cd TamangNetra
source .venv/bin/activate
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd TamangNetra/tamangnetra-frontend
npm run dev
```

Then open the frontend at `http://localhost:5173` and use the interface to translate text, documents, images, or YouTube subtitles.


