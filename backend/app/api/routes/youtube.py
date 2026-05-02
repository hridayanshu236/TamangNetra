from fastapi import APIRouter, HTTPException, Query
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from typing import List, Dict, Any, Optional
import re

router = APIRouter(prefix="/youtube", tags=["youtube"])

def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def format_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"

@router.get("/fetch")
async def fetch_subtitles(url: str = Query(...), lang: str = "en"):
    video_id = extract_video_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    try:
        # Try preferred language
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        try:
            transcript = transcript_list.find_transcript([lang, 'en'])
        except NoTranscriptFound:
            # Fallback to any available manually created or auto-generated transcript
            transcript = transcript_list.find_generated_transcript(['en'])
            if not transcript:
                transcript = next(iter(transcript_list))

        data = transcript.fetch()
        
        formatted_subtitles = []
        for i, entry in enumerate(data):
            start = entry['start']
            duration = entry['duration']
            formatted_subtitles.append({
                "index": i + 1,
                "startTime": format_time(start),
                "endTime": format_time(start + duration),
                "text": entry['text']
            })

        return {
            "subtitles": formatted_subtitles,
            "videoId": video_id,
            "title": "YouTube Video",
            "isDemo": False
        }

    except TranscriptsDisabled:
        raise HTTPException(status_code=400, detail="Subtitles are disabled for this video")
    except Exception as e:
        # If everything fails, return the demo subtitles so the UI doesn't break
        # but the user knows it's a fallback
        return {
            "subtitles": [
                {"index": 1, "startTime": "00:00:01,000", "endTime": "00:00:04,000", "text": "Could not fetch real subtitles for this video."},
                {"index": 2, "startTime": "00:00:04,500", "endTime": "00:00:08,000", "text": "This might be due to YouTube restrictions or missing captions."},
                {"index": 3, "startTime": "00:00:08,500", "endTime": "00:00:12,000", "text": "Please try a video with manual English captions."},
            ],
            "videoId": video_id,
            "title": "YouTube Video (Unavailable)",
            "isDemo": True,
            "error": str(e)
        }
