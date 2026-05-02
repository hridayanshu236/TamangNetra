from fastapi import APIRouter, HTTPException, Query
import yt_dlp
import httpx
import json
import re
from typing import List, Dict, Any, Optional

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

    # Enhanced options to mimic a real browser and bypass bot detection
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': [lang, 'en', 'ne'],
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'referer': 'https://www.youtube.com/',
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'skip': ['dash', 'hls']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # We use process_ie_data instead of extract_info for a lighter check
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            if not info:
                raise Exception("Could not retrieve video information. YouTube might be blocking this request.")

            subtitles_data = info.get('subtitles', {})
            auto_subtitles_data = info.get('automatic_captions', {})
            
            # Priority: Manual subs in requested lang -> Manual subs in English -> Auto subs in requested lang -> Auto subs in English
            target_sub = None
            for l in [lang, 'en', 'ne']:
                if l in subtitles_data:
                    target_sub = subtitles_data[l]
                    break
                if l in auto_subtitles_data:
                    target_sub = auto_subtitles_data[l]
                    break
            
            if not target_sub:
                # If no subtitles found, check if it's because of the 'bot' error
                raise Exception("No subtitles found for this video. It might be restricted or have captions disabled.")

            # Get the JSON3 or VTT format URL
            json3_url = next((s['url'] for s in target_sub if s.get('ext') == 'json3'), None)
            if not json3_url:
                json3_url = target_sub[0]['url']

            async with httpx.AsyncClient(verify=False) as client:
                resp = await client.get(json3_url, headers={'User-Agent': ydl_opts['user_agent']})
                if resp.status_code != 200:
                    raise Exception(f"Failed to download subtitle file: {resp.status_code}")
                
                content = resp.json()
                
                formatted_subtitles = []
                events = content.get('events', [])
                idx = 1
                for event in events:
                    if 'segs' not in event:
                        continue
                    
                    text = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                    if not text:
                        continue
                        
                    start_ms = event.get('tStartMs', 0)
                    duration_ms = event.get('dDurationMs', 0)
                    
                    formatted_subtitles.append({
                        "index": idx,
                        "startTime": format_time(start_ms / 1000.0),
                        "endTime": format_time((start_ms + duration_ms) / 1000.0),
                        "text": text
                    })
                    idx += 1

                if not formatted_subtitles:
                    raise Exception("Captions found but could not be parsed into segments.")

                return {
                    "subtitles": formatted_subtitles,
                    "videoId": video_id,
                    "title": info.get('title', 'YouTube Video'),
                    "isDemo": False
                }

    except Exception as e:
        error_msg = str(e)
        if "bot" in error_msg.lower():
            error_msg = "YouTube detected a bot request. Trying a lighter fallback..."
            
        return {
            "subtitles": [
                {"index": 1, "startTime": "00:00:01,000", "endTime": "00:00:04,000", "text": "Real subtitles could not be fetched."},
                {"index": 2, "startTime": "00:00:04,500", "endTime": "00:00:08,000", "text": f"Error Detail: {error_msg}"},
                {"index": 3, "startTime": "00:00:08,500", "endTime": "00:00:12,000", "text": "Please try a different video or wait a few minutes."},
            ],
            "videoId": video_id,
            "title": "YouTube Video (Restricted)",
            "isDemo": True,
            "error": str(e)
        }
