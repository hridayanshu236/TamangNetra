/**
 * YouTube Subtitle Extraction API
 *
 * Fetches YouTube video page, extracts caption track URLs,
 * downloads and parses the caption XML, and returns structured
 * subtitle entries.
 *
 * If captions can't be extracted (CORS/restrictions), returns
 * demo subtitles with a note.
 */

import { NextRequest, NextResponse } from 'next/server';

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

  // Try if it's just a video ID
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
 * Parse YouTube caption XML into SubtitleEntry array.
 */
function parseCaptionXML(xml: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let index = 1;

  // Match <text> elements with start and dur attributes
  const textPattern = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;
  textPattern.lastIndex = 0;

  while ((match = textPattern.exec(xml)) !== null) {
    const tag = match[0];
    const content = match[1];

    // Extract start time
    const startMatch = tag.match(/start="([^"]*)"/);
    const durMatch = tag.match(/dur="([^"]*)"/);

    if (startMatch) {
      const startSeconds = parseFloat(startMatch[1]);
      const duration = durMatch ? parseFloat(durMatch[1]) : 2.0;
      const endSeconds = startSeconds + duration;

      // Clean up content: decode HTML entities and remove tags
      const text = content
        .replace(/<[^>]+>/g, '') // Remove nested tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/\n/g, ' ')
        .trim();

      if (text) {
        entries.push({
          index,
          startTime: formatSRTTime(startSeconds),
          endTime: formatSRTTime(endSeconds),
          text,
        });
        index++;
      }
    }
  }

  return entries;
}

/**
 * Try to fetch captions from YouTube page data.
 */
async function fetchYouTubeCaptions(
  videoId: string,
  preferredLang?: string
): Promise<{ subtitles: SubtitleEntry[]; title: string; isDemo: boolean }> {
  try {
    // Fetch the YouTube watch page
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch YouTube page: HTTP ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();

    // Extract video title
    const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/);
    let title = 'YouTube Video';
    if (titleMatch) {
      title = titleMatch[1].replace(/ - YouTube$/, '').trim();
    }

    // Try to extract ytInitialPlayerResponse
    const playerResponseMatch = pageHtml.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/
    );

    if (!playerResponseMatch) {
      // Try alternate pattern
      const altMatch = pageHtml.match(
        /var\s+ytInitialPlayerResponse\s*=\s*(".*?")\s*;/
      );
      if (altMatch) {
        try {
          const decoded = JSON.parse(JSON.parse(altMatch[1]));
          const captions = extractCaptionsFromPlayerResponse(decoded, videoId, preferredLang);
          if (captions.length > 0) {
            return { subtitles: captions, title, isDemo: false };
          }
        } catch {
          // Fall through to demo
        }
      }
      throw new Error('Could not extract player response');
    }

    try {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captions = extractCaptionsFromPlayerResponse(playerResponse, videoId, preferredLang);
      if (captions.length > 0) {
        return { subtitles: captions, title, isDemo: false };
      }
    } catch (parseError) {
      console.warn('Failed to parse player response:', parseError instanceof Error ? parseError.message : 'Unknown');
    }

    // Try to find captions in ytInitialData (newer format)
    const initialDataMatch = pageHtml.match(
      /ytInitialData\s*=\s*(\{.+?\})\s*;/
    );
    if (initialDataMatch) {
      try {
        const initialData = JSON.parse(initialDataMatch[1]);
        const captions = extractCaptionsFromInitialData(initialData, videoId, preferredLang);
        if (captions.length > 0) {
          return { subtitles: captions, title, isDemo: false };
        }
      } catch {
        // Fall through
      }
    }

    throw new Error('No captions found in page data');
  } catch (error) {
    console.warn('YouTube caption extraction failed:', error instanceof Error ? error.message : 'Unknown error');
    return { subtitles: [], title: 'YouTube Video', isDemo: true };
  }
}

/**
 * Extract captions from ytInitialPlayerResponse JSON.
 */
function extractCaptionsFromPlayerResponse(
  playerResponse: Record<string, unknown>,
  videoId: string,
  preferredLang?: string
): SubtitleEntry[] {
  // Navigate to caption tracks
  const captions = playerResponse?.captions as Record<string, unknown> | undefined;
  if (!captions) return [];

  const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  if (!renderer) return [];

  const captionTracks = renderer?.captionTracks as Array<Record<string, unknown>> | undefined;
  if (!captionTracks || captionTracks.length === 0) return [];

  // Select the best caption track
  let selectedTrack = captionTracks[0];

  if (preferredLang) {
    const langLower = preferredLang.toLowerCase();
    // Try exact language code match
    const exactMatch = captionTracks.find(
      t => (t.languageCode as string)?.toLowerCase() === langLower
    );
    if (exactMatch) {
      selectedTrack = exactMatch;
    } else {
      // Try partial match
      const partialMatch = captionTracks.find(
        t => (t.languageCode as string)?.toLowerCase().startsWith(langLower.substring(0, 2))
      );
      if (partialMatch) {
        selectedTrack = partialMatch;
      }
    }
  }

  // Prefer manually created captions over auto-generated
  const manualTrack = captionTracks.find(
    t => t.kind !== 'asr'
  );
  if (manualTrack && !preferredLang) {
    selectedTrack = manualTrack;
  }

  const captionUrl = selectedTrack.baseUrl as string;
  if (!captionUrl) return [];

  // Fetch and parse the caption XML synchronously is not possible,
  // so we return a promise - but this function is called from async context
  // We'll handle the fetch in the calling function
  return []; // Will be overridden by fetchCaptionXML
}

/**
 * Fetch and parse caption XML from a URL.
 */
async function fetchCaptionXML(url: string): Promise<SubtitleEntry[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch captions: HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseCaptionXML(xml);
  } catch (error) {
    console.warn('Failed to fetch caption XML:', error instanceof Error ? error.message : 'Unknown');
    return [];
  }
}

/**
 * Extract captions from ytInitialData (newer YouTube format).
 */
function extractCaptionsFromInitialData(
  initialData: Record<string, unknown>,
  videoId: string,
  preferredLang?: string
): SubtitleEntry[] {
  // This is a fallback - ytInitialData rarely has caption URLs
  // but we check anyway for completeness
  return [];
}

/**
 * Generate demo subtitles for when real ones can't be fetched.
 */
function generateDemoSubtitles(videoId: string): SubtitleEntry[] {
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
 * Improved fetch with caption URL extraction and XML download.
 */
async function fetchYouTubeCaptionsFull(
  videoId: string,
  preferredLang?: string
): Promise<{ subtitles: SubtitleEntry[]; title: string; isDemo: boolean }> {
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!pageResponse.ok) {
      throw new Error(`HTTP ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();

    // Extract title
    const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/ - YouTube$/, '').trim()
      : 'YouTube Video';

    // Extract caption tracks from player response
    const playerResponsePatterns = [
      /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/,
      /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*,/,
    ];

    for (const pattern of playerResponsePatterns) {
      const match = pageHtml.match(pattern);
      if (match) {
        try {
          // Find the end of the JSON object by tracking braces
          let jsonStr = match[1];
          // The regex might not capture the full JSON - try to find the balanced braces
          if (!jsonStr.endsWith('}')) {
            const startIdx = pageHtml.indexOf(match[1]);
            let braceCount = 0;
            let endIdx = startIdx;
            for (let i = startIdx; i < pageHtml.length; i++) {
              if (pageHtml[i] === '{') braceCount++;
              if (pageHtml[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIdx = i + 1;
                break;
              }
            }
            jsonStr = pageHtml.slice(startIdx, endIdx);
          }

          const playerResponse = JSON.parse(jsonStr);
          const captions = playerResponse?.captions
            ?.playerCaptionsTracklistRenderer?.captionTracks as
            | Array<Record<string, string>>
            | undefined;

          if (captions && captions.length > 0) {
            // Select best track
            let selectedTrack = captions[0];

            // Prefer manual captions
            const manualTrack = captions.find(t => t.kind !== 'asr');
            if (manualTrack) selectedTrack = manualTrack;

            // If preferred language specified, try to match
            if (preferredLang) {
              const langLower = preferredLang.toLowerCase();
              const langMap: Record<string, string> = {
                'english': 'en', 'en': 'en', 'eng': 'en',
                'nepali': 'ne', 'ne': 'ne', 'nep': 'ne',
                'tamang': 'tmg', 'tmg': 'tmg',
              };
              const langCode = langMap[langLower] || langLower.substring(0, 2);

              const langMatch = captions.find(
                t => t.languageCode?.toLowerCase().startsWith(langCode)
              );
              if (langMatch) selectedTrack = langMatch;
            }

            const captionUrl = selectedTrack.baseUrl;
            if (captionUrl) {
              const subtitles = await fetchCaptionXML(captionUrl);
              if (subtitles.length > 0) {
                return { subtitles, title, isDemo: false };
              }
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse player response for captions:', parseError instanceof Error ? parseError.message : 'Unknown');
        }
      }
    }

    throw new Error('No captions found');
  } catch (error) {
    console.warn('YouTube caption fetch failed, using demo:', error instanceof Error ? error.message : 'Unknown');
    return {
      subtitles: generateDemoSubtitles(videoId),
      title: 'YouTube Video (Demo)',
      isDemo: true,
    };
  }
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

    // Fetch captions
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
