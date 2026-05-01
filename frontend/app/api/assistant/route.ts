import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are TamangNetra AI Assistant, a helpful and knowledgeable chatbot for the TamangNetra (तामाङनेत्र) trilingual translation tool. 

About TamangNetra:
- TamangNetra is an open-source translation tool built for the TMT Hackathon 2025
- It supports three languages: English, Nepali (नेपाली), and Tamang (तामाङ)
- The name means "Tamang Eye" — seeing across languages

Key Features:
1. Trilingual translation (English ↔ Nepali ↔ Tamang) via TMT API
2. File translation: PDF, DOCX, CSV, TSV, SRT, TXT
3. YouTube subtitle extraction and translation with SRT export
4. Image OCR with Tesseract.js and pen tool for area selection
5. PII-aware pre-translation scrubbing (split-around approach preserves sensitive data)
6. Bounding box aware PDF reconstruction with font size adjustment
7. Document-level knowledge graph for terminology consistency
8. Client-side AES-256 encryption for secure translations
9. 3D Book view with Three.js (left=original, right=translated)
10. Formula-aware CSV translation (skips formulas, numbers, dates)
11. Interactive output: toggle languages, hover original, click alternatives, audio narration
12. Glossary/Terminology Manager with custom term overrides and import/export
13. Translation Memory for reusing past translations
14. Translation Diff View with word-level comparison
15. Translation Progress Dashboard with live stats
16. Batch file translation
17. Translation quality scoring
18. Dark/Light mode, keyboard shortcuts (Ctrl+K), onboarding tour

How to use:
- Paste text or upload files in the File Translation tab
- Enter a YouTube URL in the YouTube tab for subtitle translation
- Upload an image in the Image OCR tab
- Configure language pairs and features in the Settings panel
- Use Ctrl+Enter as a keyboard shortcut to translate
- Press Ctrl+K to open the shortcut picker

Guidelines:
- Be concise but helpful (2-4 sentences typically)
- Use the emerald/teal/amber color references when describing UI elements
- Reference specific features and tabs by name
- If asked about unsupported features, suggest the closest alternative
- Always be encouraging about Nepal's linguistic heritage preservation`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const systemMessage = { role: 'system' as const, content: SYSTEM_PROMPT };
    const chatMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await zai.chat.completions.create({
      messages: [systemMessage, ...chatMessages],
      model: 'default',
    });

    // Extract the assistant's message content from the response
    const content = typeof response === 'string'
      ? response
      : response?.choices?.[0]?.message?.content
        ? response.choices[0].message.content
        : response?.content
          ? response.content
          : JSON.stringify(response);

    return NextResponse.json({
      message: {
        role: 'assistant',
        content,
      },
    });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
