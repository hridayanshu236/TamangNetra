from fastapi import APIRouter, HTTPException, Query
import httpx
import re
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/youtube", tags=["YouTube Proxy"])

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

@router.get("/transcript")
async def get_youtube_transcript(v: str = Query(..., description="YouTube Video ID")):
    """
    Fetch YouTube transcript JSON directly from the backend to bypass CORS and frontend blocks.
    """
    video_url = f"https://www.youtube.com/watch?v={v}"
    
    async with httpx.AsyncClient(follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        try:
            # 1. Fetch the video page
            response = await client.get(video_url, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"Failed to fetch YouTube page for {v}: {response.status_code}")
                raise HTTPException(status_code=500, detail="Could not fetch YouTube video page.")
            
            html = response.text
            
            # 2. Extract captionTracks
            # We look for the ytInitialPlayerResponse object in the HTML
            regex = r'"captionTracks":\s*(\[.*?\])'
            match = re.search(regex, html)
            
            if not match:
                logger.warning(f"No captions found in HTML for {v}")
                raise HTTPException(status_code=404, detail="No subtitles found for this video. Please ensure it has manual or auto-generated captions.")
            
            caption_tracks = json.loads(match.group(1))
            
            # 3. Find the best track (English preferred)
            track = None
            for t in caption_tracks:
                if t.get("languageCode") == "en":
                    track = t
                    break
            
            if not track:
                track = caption_tracks[0]
                
            base_url = track.get("baseUrl")
            if not base_url:
                raise HTTPException(status_code=404, detail="Could not find transcript URL.")
            
            # 4. Fetch the actual transcript JSON (json3 format)
            transcript_response = await client.get(base_url + "&fmt=json3", timeout=10.0)
            if transcript_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch transcript data from YouTube.")
            
            return transcript_response.json()
            
        except httpx.RequestError as e:
            logger.error(f"Network error fetching YouTube data: {e}")
            raise HTTPException(status_code=502, detail="Network error connecting to YouTube.")
        except Exception as e:
            logger.error(f"Unexpected error in YouTube proxy: {e}")
            raise HTTPException(status_code=500, detail=str(e))
