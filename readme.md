# TamangNetra

Full-stack app using FastAPI (backend), Next.js (frontend), Redis, and Docker.

---

## 📁 Setup

### 1. Clone & enter project

```bash
git clone <repo-url>
cd TamangNetra
```

### 2. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

---

## 🐳 Run with Docker

**Start all services**
```bash
docker-compose up --build
```

**Run in background**
```bash
docker-compose up -d
```

**Stop services**
```bash
docker-compose down
```

---

## 🧩 Run Individual Services

**Backend only**
```bash
docker-compose up api
```

**Frontend only**
```bash
docker-compose up web
```

---

## 🌐 URLs

* **Frontend** → [http://localhost:3000](http://localhost:3000)
* **Backend** → [http://localhost:8000](http://localhost:8000)
* **API Docs** → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔄 Rebuild (if needed)

```bash
docker-compose up --build
```

---

## ⚠️ Notes

* Ports **3000**, **8000**, and **6379** must be free on your local machine.
* Docker manages all dependencies internally (no need for a Python `venv` or local `node_modules`).
```





## Create env.local.example in frontend

with the content: NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

```bash
cp .env.local.example .env.local
```

---

