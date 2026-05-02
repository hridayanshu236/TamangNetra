import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, language } = body as {
      audio: string; // base64-encoded audio data
      language?: string;
    };

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json(
        { error: 'Audio data is required as a base64-encoded string.' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const asrResult = await zai.audio.asr.create({
      file_base64: audio,
    });

    // The ASR API returns a JSON response with transcription
    // Normalize the response to our expected format
    const text =
      asrResult?.text ||
      asrResult?.result?.text ||
      (typeof asrResult === 'string' ? asrResult : '') ||
      '';

    const confidence =
      asrResult?.confidence ??
      asrResult?.result?.confidence ??
      (text ? 0.9 : 0);

    return NextResponse.json({
      text,
      confidence,
    });
  } catch (error) {
    console.error('ASR route error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
