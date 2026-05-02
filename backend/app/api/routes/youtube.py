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

import os

@router.get("/transcript")
async def get_youtube_transcript(v: str = Query(..., description="YouTube Video ID")):
    """
    Fetch YouTube transcripts using youtube-transcript-api.
    Uses Webshare residential proxies to bypass data center IP blocks.
    """
    try:
        # Proxy Configuration from Environment Variables
        # Recommended format for Webshare: http://user:pass@p.webshare.io:80
        username = os.getenv("WEBSHARE_USERNAME")
        password = os.getenv("WEBSHARE_PASSWORD")
        proxy_host = os.getenv("WEBSHARE_PROXY_HOST", "p.webshare.io:80")
        
        proxies = None
        if username and password:
            proxy_url = f"http://{username}:{password}@{proxy_host}"
            proxies = {
                "http": proxy_url,
                "https": proxy_url
            }
            logger.info(f"Using Webshare proxy for {v}")

        # Fetch transcript
        data = YouTubeTranscriptApi.get_transcript(v, languages=['en', 'ne', 'hi'], proxies=proxies)
        
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
            "language": "en",
            "rows": rows
        }

    except Exception as e:
        logger.error(f"YouTube Transcript API failed for {v}: {e}")
        
        # Fallback to hardcoded demo data for demo video
        if v == "SJPu1spHqfk":
            return {
                "video_id": v,
                "title": "YouTube Player Demo (Offline Mode)",
                "language": "en",
                "rows": [
                    {"index": 0, "start": "00:00", "start_seconds": 0, "duration": 4, "text": "This is a demonstration of the YouTube Player API."},
                    {"index": 1, "start": "00:04", "start_seconds": 4.5, "duration": 4, "text": "You can control playback, fetch captions, and sync with your app."},
                    {"index": 2, "start": "00:08", "start_seconds": 8.5, "duration": 4, "text": "TamangNetra uses this data to provide trilingual translations in real-time."}
                ]
            }
            
        raise HTTPException(
            status_code=500, 
            detail=f"Could not retrieve transcripts: {str(e)}"
        )
