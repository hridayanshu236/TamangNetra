from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import httpx
import json
import re
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/youtube", tags=["YouTube"])

@router.get("/transcript")
async def get_youtube_transcript(v: str = Query(..., description="YouTube Video ID")):
    """
    Fetch YouTube transcripts using youtube-transcript-api with yt-dlp fallback.
    Most resilient method for data center IPs.
    """
    try:
        # 1. Primary Method: youtube-transcript-api
        transcript_list = YouTubeTranscriptApi.list_transcripts(v)
        
        # Try to find manual or auto-generated English
        try:
            transcript = transcript_list.find_transcript(['en', 'ne', 'hi'])
        except:
            # Fallback to the first available transcript
            transcript = next(iter(transcript_list))
            
        data = transcript.fetch()
        
        rows = []
        for i, entry in enumerate(data):
            start = entry['start']
            duration = entry['duration']
            rows.append({
                "index": i,
                "start": f"{int(start//60):02}:{int(start%60):02}",
                "start_seconds": start,
                "duration": duration,
                "text": entry['text']
            })
            
        return {
            "video_id": v,
            "title": f"YouTube Video ({v})",
            "language": transcript.language_code,
            "rows": rows
        }

    except Exception as e:
        logger.warning(f"youtube-transcript-api failed for {v}: {e}")
        
        # 2. Secondary Method: yt-dlp fallback
        video_url = f"https://www.youtube.com/watch?v={v}"
        clients = [['android', 'web'], ['ios', 'web']]
        
        for client_list in clients:
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en', 'ne', 'hi'],
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {'youtube': {'player_client': client_list, 'skip': ['dash', 'hls']}}
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    subtitles = info.get('subtitles', {}) or info.get('automatic_captions', {})
                    
                    target_url = None
                    lang_code = None
                    for l in ['en', 'ne', 'hi']:
                        if l in subtitles:
                            target_url = next((s['url'] for s in subtitles[l] if s.get('ext') == 'json3'), subtitles[l][0]['url'])
                            lang_code = l
                            break
                    
                    if not target_url: continue

                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(target_url)
                        if resp.status_code != 200: continue
                        
                        data = resp.json()
                        rows = []
                        if "events" in data:
                            for i, event in enumerate(data["events"]):
                                if "segs" in event:
                                    text = "".join([s["utf8"] for s in event["segs"]]).strip()
                                    if text:
                                        start = event.get("tStartMs", 0) / 1000.0
                                        duration = event.get("dDurationMs", 0) / 1000.0
                                        rows.append({
                                            "index": i,
                                            "start": f"{int(start//60):02}:{int(start%60):02}",
                                            "start_seconds": start,
                                            "duration": duration,
                                            "text": text
                                        })
                        
                        return {
                            "video_id": v,
                            "title": info.get('title', 'YouTube Video'),
                            "language": lang_code,
                            "rows": rows
                        }
            except:
                continue

    raise HTTPException(status_code=500, detail="Could not retrieve transcripts from YouTube. The video might be restricted or captions are disabled.")
