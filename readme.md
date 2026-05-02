# TamangNetra (तामाङ नेत्र)

**High-Fidelity Document Translation with Native Layout Preservation**

TamangNetra is an industry-grade document translation platform engineered specifically for the TMT (Trilingual Machine Translation) ecosystem. Unlike traditional translators that destroy document layouts by converting them to plain text or unstable HTML, TamangNetra utilizes Native Coordinate-Based Reconstruction to overlay translations directly onto the original document buffer.

---

## How It Works

TamangNetra uses specialized engines for different file formats to ensure maximum fidelity and readability.

### 1. PDF: Native Overlay Hybrid
Most PDF translators suffer from Layout Drift. TamangNetra solves this using a custom Hybrid engine:
-   **Extraction**: PyMuPDF (`fitz`) extracts text at the "span" level, capturing precise (x, y) coordinates, font size, and color.
-   **Surgical Redaction**: The original text is removed at the byte level using PyMuPDF's redaction engine, preserving the underlying vector graphics, tables, and images.
-   **Intelligent Sampling**: The system samples the background color of each text block to ensure the "white-out" is invisible, even on shaded table headers.
-   **ReportLab Layering**: A transparent text layer is generated using ReportLab and merged onto the original PDF, ensuring 100% visible, high-quality typography.
-   **Formula Protection**: A heuristic filter detects mathematical fonts and symbols to skip redaction, keeping technical diagrams intact.

### 2. DOCX: Run-by-Run Translation
To preserve Word document styles:
-   The system iterates through every Paragraph and "Run" (formatted text block) using `python-docx`.
-   Each run is translated individually, allowing the original bolding, italics, and font sizes to be re-applied to the translated text.

### 3. CSV, TSV & XLSX: Tabular Mapping
For spreadsheets and data:
-   `pandas` loads the data into a DataFrame.
-   The system maps every unique cell and column header to its translation while maintaining the exact row-column structure.
-   The output is reconstructed as a native CSV/TSV with preserved delimiters.

---

## TMT API Handling & Optimization

The TMT API is powerful but requires careful orchestration for high-volume documents. TamangNetra implements several layers of optimization:

-   **Semaphore-based Concurrency**: API calls are limited to 3 concurrent requests. This prevents server overload and reduces the likelihood of 429 (Too Many Requests) errors.
-   **Exponential Backoff**: If the API returns a rate limit or server error, TamangNetra automatically retries with increasing wait times (jittered to avoid synchronization issues).
-   **Normalized Translation Cache**: Every translation is stored in a persistent local JSON cache. Text is stripped and normalized before caching to ensure that a sentence translated in a PDF will hit the cache if it appears again in a DOCX or CSV.
-   **Bit-Identical Reconstruction**: During the "Download" phase, the system is forced into a **Cache-Only mode**. This ensures 0 redundant API calls and near-instant document generation.

---

## Features

-   **Multi-Format Support**: Native handling for PDF, DOCX, CSV, TSV.
-   **Trilingual Neural Translation**: Seamless high-fidelity translation between English, Nepali, and Tamang.
-   **Layout Preservation**: Protects images, tables and text layouts.
-   **Rate-Limit Resiliency**: Intelligent retry logic designed for the API.

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- TMT API Token (Place in backend/.env)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1.  Open http://localhost:3000.
2.  Upload any supported file.
3.  Watch the real-time translation progress.
4.  Preview the results and click "Download" to get your translated document.

---

### 4. Video Guide Link
- **Drive** : [Link](https://drive.google.com/drive/folders/1AKfbe1exTik0bgdtv69LaOYG44NdwklB?usp=sharing)
- **Video**: [Link](https://drive.google.com/file/d/1AsYMCyqTzLS1oyy_ticiGGKdWyHTjVAl/view?usp=sharing)

