# TamangNetra

TamangNetra is a full-stack, secure application featuring dynamic translations, PII-scrubbing, PDF text extraction/reconstruction, and encrypted payloads. It utilizes FastAPI (backend), Next.js (frontend), Redis, and Docker.

---

## 📁 Features Added

- **AES-256-CBC Cryptography**: Secure payload synchronization between frontend and backend.
- **PII Scrubbing**: SpaCy-powered data masking and restoration.
- **Translation Pipeline**: Asynchronous multi-language (Nepali, Tamang) context translations with Glossary parsing.
- **PDF Engine**: Dynamic PyMuPDF and ReportLab coordinate translation to reconstruct translated texts into Devanagari natively.

---

## 🚀 Setup & Installation

### 1. Clone & Enter Project

```bash
git clone <repo-url>
cd TamangNetra
```

### 2. Environment Configuration

Copy the example environment files into their active formats:

```bash
# Setup backend environments
cp backend/.env.example backend/.env

# Setup frontend environments
cp frontend/.env.local.example frontend/.env.local
```

Ensure the contents match your local keys. For instance, `frontend/.env.local` should minimally contain:
`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

---

## 🐳 Running with Docker

Docker will manage all the requirements (such as `reportlab`, `fitz`, `spacy`, fonts, and `node_modules`).

**Start all services**
```bash
make start
# OR
docker-compose up --build
```

**Run in background**
```bash
make dev
# OR
docker-compose up -d
```

**Stop services**
```bash
make down
# OR
docker-compose down
```

---

## 🌐 Endpoints & URLs

* **Frontend UI** → [http://localhost:3000](http://localhost:3000)
* **Backend API** → [http://localhost:8000](http://localhost:8000)
* **Interactive API Docs** → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚠️ Requirements & Notes

* Ports **3000** (Next.js), **8000** (FastAPI), and **6379** (Redis) must be free on your local machine.
* Do not forget to configure the `HACKATHON_API_URL` within the `backend/.env` file if you wish to toggle off the MockTranslator.
