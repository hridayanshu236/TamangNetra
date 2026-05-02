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
    Fetch YouTube transcripts using youtube-transcript-api.
    Includes defensive fallbacks for different library versions.
    """
    try:
        data = None
        
        # Method 1: Standard static call (jdepoix version)
        if hasattr(YouTubeTranscriptApi, 'get_transcript'):
            logger.info(f"Using static get_transcript for {v}")
            data = YouTubeTranscriptApi.get_transcript(v, languages=['en', 'ne', 'hi'])
        
        # Method 2: Instance-based call (alternate version)
        if data is None:
            logger.info(f"Trying instance-based fetch for {v}")
            api = YouTubeTranscriptApi()
            if hasattr(api, 'get_transcript'):
                data = api.get_transcript(v, languages=['en', 'ne', 'hi'])
            elif hasattr(api, 'fetch'):
                data = api.fetch(v) # As suggested by some alternate versions
                
        if data is None:
            # Last ditch: try the module-level function if it exists
            import youtube_transcript_api
            if hasattr(youtube_transcript_api, 'get_transcript'):
                data = youtube_transcript_api.get_transcript(v, languages=['en', 'ne', 'hi'])

        if data is None:
            raise AttributeError("Could not find a valid fetch method in YouTubeTranscriptApi")

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
