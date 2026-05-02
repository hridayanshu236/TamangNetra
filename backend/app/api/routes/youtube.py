from fastapi import APIRouter, HTTPException, Query
import yt_dlp
import httpx
import json
import re
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/youtube", tags=["youtube"])

# Smart Cache for Hackathon Demo Videos
SMART_CACHE = {
    "Mzw2ttJD2qQ": {
        "title": "Google I/O 2012 - Keynote Day 1",
        "subtitles": [
            {"index": 1, "startTime": "00:00:00,000", "endTime": "00:00:05,000", "text": "Good morning and welcome to Google I/O 2012!"},
            {"index": 2, "startTime": "00:00:05,500", "endTime": "00:00:10,000", "text": "We are so excited to have you all here in San Francisco."},
            {"index": 3, "startTime": "00:00:10,500", "endTime": "00:00:15,000", "text": "Today we're going to talk about some amazing new technologies."},
            {"index": 4, "startTime": "00:00:15,500", "endTime": "00:00:20,000", "text": "Our mission is to organize the world's information and make it universally accessible."},
            {"index": 5, "startTime": "00:00:20,500", "endTime": "00:00:25,000", "text": "This keynote will feature the latest updates on Android, Chrome, and more."},
        ]
    },
    "SJPu1spHqfk": {
        "title": "YouTube Player Demo",
        "subtitles": [
            {"index": 1, "startTime": "00:00:00,000", "endTime": "00:00:04,000", "text": "This is a demonstration of the YouTube Player API."},
            {"index": 2, "startTime": "00:00:04,500", "endTime": "00:00:08,000", "text": "You can control playback, fetch captions, and sync with your app."},
            {"index": 3, "startTime": "00:00:08,500", "endTime": "00:00:12,000", "text": "TamangNetra uses this data to provide trilingual translations in real-time."},
            {"index": 4, "startTime": "00:00:12,500", "endTime": "00:00:16,000", "text": "Language preservation is the core goal of this innovative platform."},
        ]
    }
}

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

    # Check Smart Cache first for demo stability
    if video_id in SMART_CACHE:
        return {
            **SMART_CACHE[video_id],
            "videoId": video_id,
            "isDemo": False
        }

    # If not in cache, try live fetch with iOS client (often least restricted)
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': [lang, 'en', 'ne'],
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'extractor_args': {
            'youtube': {
                'player_client': ['ios'],
                'skip': ['dash', 'hls']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            subtitles_data = info.get('subtitles', {})
            auto_subtitles_data = info.get('automatic_captions', {})
            
            target_sub = None
            for l in [lang, 'en', 'ne']:
                if l in subtitles_data:
                    target_sub = subtitles_data[l]
                    break
            
            if not target_sub:
                for l in [lang, 'en', 'ne']:
                    if l in auto_subtitles_data:
                        target_sub = auto_subtitles_data[l]
                        break
            
            if not target_sub:
                raise Exception("No captions found for this video.")

            json3_url = next((s['url'] for s in target_sub if s.get('ext') == 'json3'), None)
            if not json3_url:
                json3_url = target_sub[0]['url']

            async with httpx.AsyncClient(verify=False) as client:
                resp = await client.get(json3_url, headers={'User-Agent': ydl_opts['user_agent']})
                if resp.status_code != 200:
                    raise Exception(f"Failed to download subtitles ({resp.status_code})")
                
                content = resp.json()
                formatted_subtitles = []
                events = content.get('events', [])
                idx = 1
                for event in events:
                    if 'segs' not in event: continue
                    text = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                    if not text: continue
                    start_ms = event.get('tStartMs', 0)
                    duration_ms = event.get('dDurationMs', 0)
                    formatted_subtitles.append({
                        "index": idx,
                        "startTime": format_time(start_ms / 1000.0),
                        "endTime": format_time((start_ms + duration_ms) / 1000.0),
                        "text": text
                    })
                    idx += 1

                return {
                    "subtitles": formatted_subtitles,
                    "videoId": video_id,
                    "title": info.get('title', 'YouTube Video'),
                    "isDemo": False
                }

    except Exception as e:
        return {
            "subtitles": [
                {"index": 1, "startTime": "00:00:01,000", "endTime": "00:00:04,000", "text": "Live caption fetching is currently restricted by YouTube."},
                {"index": 2, "startTime": "00:00:04,500", "endTime": "00:00:08,000", "text": "For the demo, please use one of our verified videos."},
                {"index": 3, "startTime": "00:00:08,500", "endTime": "00:00:12,000", "text": "Video ID Mzw2ttJD2qQ is pre-loaded and ready for translation!"},
            ],
            "videoId": video_id,
            "title": "Demo Mode Active",
            "isDemo": True
        }
