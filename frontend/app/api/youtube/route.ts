/**
 * YouTube Subtitle Extraction API
 */

import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface YouTubeResponse {
  subtitles: SubtitleEntry[];
  videoId: string;
  title: string;
  isDemo: boolean;
}

/**
 * Extract video ID from various YouTube URL formats.
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

/**
 * Format seconds to SRT time format: HH:MM:SS,mmm
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Generate demo subtitles for when real ones can't be fetched.
 */
function generateDemoSubtitles(_videoId: string): SubtitleEntry[] {
  return [
    { index: 1, startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Welcome to this presentation about language preservation.' },
    { index: 2, startTime: '00:00:04,500', endTime: '00:00:08,000', text: 'Today we will discuss the importance of multilingual communication.' },
    { index: 3, startTime: '00:00:08,500', endTime: '00:00:12,000', text: 'Nepal is home to over 120 languages and dialects.' },
    { index: 4, startTime: '00:00:12,500', endTime: '00:00:16,000', text: 'The Tamang language is spoken by over a million people.' },
    { index: 5, startTime: '00:00:16,500', endTime: '00:00:20,000', text: 'Technology can help bridge the gap between these languages.' },
    { index: 6, startTime: '00:00:20,500', endTime: '00:00:24,000', text: 'Machine translation enables cross-cultural understanding.' },
    { index: 7, startTime: '00:00:24,500', endTime: '00:00:28,000', text: 'We must preserve linguistic diversity for future generations.' },
    { index: 8, startTime: '00:00:28,500', endTime: '00:00:32,000', text: 'Thank you for watching this brief overview.' },
  ];
}

/**
 * Fetch YouTube captions using youtube-transcript package.
 * Tries preferred language first, then falls back to any available language,
 * and finally falls back to demo subtitles.
 */
async function fetchYouTubeCaptionsFull(
  videoId: string,
  preferredLang?: string
): Promise<{ subtitles: SubtitleEntry[]; title: string; isDemo: boolean }> {
  let transcriptItems = null;

  // Step 1: Try with preferred language if provided
  if (preferredLang) {
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: preferredLang,
      });
    } catch (err) {
      console.warn(
        `Transcript not found for lang "${preferredLang}", trying without lang:`,
        err instanceof Error ? err.message : 'Unknown'
      );
    }
  }

  // Step 2: Try without any language filter (grabs first available track)
  if (!transcriptItems || transcriptItems.length === 0) {
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      console.warn(
        'Transcript fetch failed entirely, using demo:',
        err instanceof Error ? err.message : 'Unknown'
      );
    }
  }

  // Step 3: Fall back to demo if nothing worked
  if (!transcriptItems || transcriptItems.length === 0) {
    return {
      subtitles: generateDemoSubtitles(videoId),
      title: 'YouTube Video (Demo)',
      isDemo: true,
    };
  }

  // Convert to SubtitleEntry format
  const subtitles: SubtitleEntry[] = transcriptItems.map((item, i) => {
    const startSeconds = item.offset / 1000; // offset is in ms
    const endSeconds = startSeconds + item.duration / 1000;
    return {
      index: i + 1,
      startTime: formatSRTTime(startSeconds),
      endTime: formatSRTTime(endSeconds),
      text: item.text,
    };
  });

  return { subtitles, title: 'YouTube Video', isDemo: false };
}

/**
 * POST /api/youtube
 *
 * Request body: { url: string, src_lang?: string }
 *
 * Response:
 * {
 *   subtitles: Array<{ index, startTime, endTime, text }>,
 *   videoId: string,
 *   title: string,
 *   isDemo: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let body: { url?: string; src_lang?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { url, src_lang } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'url is required and must be a string' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL. Please provide a valid YouTube URL.' },
        { status: 400 }
      );
    }

    const result = await fetchYouTubeCaptionsFull(videoId, src_lang);

    const response: YouTubeResponse = {
      subtitles: result.subtitles,
      videoId,
      title: result.title,
      isDemo: result.isDemo,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('YouTube API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'YouTube subtitle extraction failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/youtube — Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'YouTube Subtitle Extraction API',
    supportedFormats: ['youtube.com/watch?v=', 'youtu.be/', 'youtube.com/embed/'],
  });
}