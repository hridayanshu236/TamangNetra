import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, lang, speed } = body as {
      text: string;
      lang?: string;
      speed?: number;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Clamp text length to avoid extremely long requests
    const truncatedText = text.slice(0, 2000);

    const zai = await ZAI.create();

    const ttsResponse = await zai.audio.tts.create({
      input: truncatedText,
      voice: lang === 'ne' ? 'alloy' : 'alloy',
      speed: speed ?? 1.0,
      response_format: 'mp3',
    });

    // ttsResponse is a standard Response object from the SDK
    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('TTS API error:', errorText);
      return NextResponse.json(
        { error: 'TTS generation failed', details: errorText },
        { status: ttsResponse.status }
      );
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await ttsResponse.arrayBuffer();

    // Determine content type from response header or default to audio/mpeg
    const contentType =
      ttsResponse.headers.get('content-type') || 'audio/mpeg';

    return new NextResponse(audioBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS route error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
