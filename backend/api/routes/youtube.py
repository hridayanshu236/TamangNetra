from fastapi import APIRouter
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from backend.services.translator import translator
from backend.services.sentence_splitter import split as split_sentences

router = APIRouter()

class YouTubeRequest(BaseModel):
    url: str
    src_lang: str
    tgt_lang: str

@router.post("/youtube/translate")
async def youtube_translate(req: YouTubeRequest):
    vid_id = req.url.split("v=")[-1].split("&")[0].split("/")[-1]
    transcript = YouTubeTranscriptApi.get_transcript(vid_id)

    for seg in transcript:
        seg["translated"] = await translator.translate(seg["text"], req.src_lang, req.tgt_lang)

    srt = _to_srt(transcript)
    return {"transcript": transcript, "srt": srt}

def _to_srt(transcript):
    lines = []
    for i, s in enumerate(transcript, 1):
        start = _fmt(s["start"])
        end   = _fmt(s["start"] + s["duration"])
        lines.append(f"{i}\n{start} --> {end}\n{s['translated']}\n")
    return "\n".join(lines)

def _fmt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"