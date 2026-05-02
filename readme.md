# TamangNetra 👁️

TamangNetra is an advanced, high-performance document translation system designed to bridge the language gap for the Tamang and Nepali communities. It leverages state-of-the-art AI to translate documents while preserving their original layout, formatting, and images.

## ✨ Features

- **Real-Time Translation**: Lightning-fast translation powered by the TMT API.
- **Document Integrity**: Supports PDF, DOCX, CSV, and Excel while keeping styles (bold, italic), tables, and images intact.
- **OCR Support**: Built-in optical character recognition for translating text within images.
- **Smart Caching**: Persistent Knowledge Graph cache ensures that previously translated sentences are retrieved instantly at zero cost.
- **Modern UI**: A sleek, premium dashboard with dark mode, real-time progress tracking, and interactive previews.
- **Multi-Format Support**:
  - **PDF**: Granular span-level redaction preserves formulas and images.
  - **DOCX**: Run-level reconstruction maintains Microsoft Word styling.
  - **YouTube**: Fetch and translate subtitles directly from video links.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Tesseract OCR (Optional, for image translation)

### Quick Setup

1. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   python main.py
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Usage
1. **Upload**: Drag and drop your document (PDF, DOCX, etc.).
2. **Translate**: Select your target language and click "Translate".
3. **Review**: Watch the real-time progress and typewriter-effect preview.
4. **Download**: Get your perfectly formatted translated document.

## 📜 License
© 2026 TamangNetra Team. All rights reserved.
