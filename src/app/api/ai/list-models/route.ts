import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;

export async function GET() {
  try {
    if (HF_API_KEY) {
      // Try Hugging Face models listing
      const res = await fetch('https://api-inference.huggingface.co/models?limit=50', {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`
        }
      });
      const json = await res.json();
      return NextResponse.json({ provider: 'huggingface', ok: res.ok, status: res.status, body: json });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing HF_API_KEY and GEMINI_API_KEY in environment' }, { status: 400 });
    }

    const res = await fetch('https://generativelanguage.googleapis.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const json = await res.json();
    return NextResponse.json({ provider: 'gemini', ok: res.ok, status: res.status, body: json });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
