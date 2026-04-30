import os, uuid, json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, Form
from fastapi.responses import FileResponse
from backend.services.translator import translator
from backend.services.sentence_splitter import split as split_sentences
from backend.services.glossary import TermGlossary
from backend.processors.pdf_processor import process_pdf
from backend.processors.docx_processor import process_docx
from backend.processors.csv_processor import process_csv

router = APIRouter()
OUTPUT_DIR = "/tmp/tamangnetra_outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.websocket("/ws/translate")
async def ws_translate(websocket: WebSocket):
    await websocket.accept()
    try:
        # Receive file metadata first
        meta = await websocket.receive_json()
        src, tgt, filename = meta["src_lang"], meta["tgt_lang"], meta["filename"]

        # Receive file bytes
        file_bytes = await websocket.receive_bytes()

        ext = filename.rsplit(".", 1)[-1].lower()
        job_id = str(uuid.uuid4())
        input_path = f"{OUTPUT_DIR}/{job_id}_input.{ext}"
        output_path = f"{OUTPUT_DIR}/{job_id}_output.{ext}"

        with open(input_path, "wb") as f:
            f.write(file_bytes)

        glossary = TermGlossary()

        async def progress(current, total, msg=""):
            await websocket.send_json({
                "type": "progress",
                "current": current,
                "total": total,
                "pct": round(current / total * 100) if total else 0,
                "msg": msg
            })

        if ext == "pdf":
            await process_pdf(input_path, output_path, src, tgt, translator, glossary, progress)
        elif ext == "docx":
            await process_docx(input_path, output_path, src, tgt, translator, glossary, progress)
        elif ext in ("csv", "tsv"):
            delimiter = "\t" if ext == "tsv" else ","
            await process_csv(input_path, output_path, src, tgt, translator, glossary, progress, delimiter)
        else:
            await websocket.send_json({"type": "error", "msg": "Unsupported format"})
            return

        await websocket.send_json({
            "type": "done",
            "download_url": f"/download/{job_id}/{filename}",
            "glossary": glossary.cache
        })
    except WebSocketDisconnect:
        pass

@router.get("/download/{job_id}/{filename}")
async def download(job_id: str, filename: str):
    ext = filename.rsplit(".", 1)[-1].lower()
    path = f"{OUTPUT_DIR}/{job_id}_output.{ext}"
    return FileResponse(path, filename=f"translated_{filename}",
                        media_type="application/octet-stream")