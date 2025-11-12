import { NextResponse } from 'next/server';
import { checkProfanity, validateText } from '@/app/lib/profanityFilter';

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json();

    if (!keywords || !keywords.trim()) {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }

    // Check for profanity in input keywords
    const inputValidation = validateText(keywords);
    if (inputValidation) {
      return NextResponse.json({ 
        error: 'Inappropriate language detected',
        message: inputValidation,
        profanityDetected: true
      }, { status: 400 });
    }

    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    if (!HF_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        message: 'Hugging Face API key is required. Please configure HUGGINGFACE_API_KEY in your environment variables.'
      }, { status: 500 });
    }

    // Use Hugging Face router API with chat completions format
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates engaging event descriptions for college events. Keep descriptions concise (2-3 sentences), friendly, and informative.',
            },
            {
              role: 'user',
              content: `Write a brief, engaging description for a college event based on these keywords: ${keywords}`,
            },
          ],
          model: 'CohereLabs/aya-expanse-32b:cohere',
          max_tokens: 150,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      // Hugging Face might return 503 if model is loading
      if (response.status === 503) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json({ 
          error: 'AI model is loading. Please try again in a few seconds.',
          details: errorData.error || 'Model is starting up'
        }, { status: 503 });
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error('Hugging Face API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to generate description',
        details: errorData.error?.message || errorData.error || 'Unknown error'
      }, { status: 500 });
    }

    const data = await response.json();
    
    // Chat completions format returns choices array with message content
    let description = '';
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      description = data.choices[0]?.message?.content || '';
    } else if (data.content) {
      description = data.content;
    } else if (typeof data === 'string') {
      description = data;
    }

    // Clean up the generated text
    description = description.trim();
    
    // Check for profanity in generated description
    const descriptionValidation = validateText(description);
    if (descriptionValidation) {
      // If AI generated inappropriate content, return error
      return NextResponse.json({ 
        error: 'Generated content contains inappropriate language',
        message: 'The AI generated content that may be inappropriate. Please try again or write your own description.',
        profanityDetected: true
      }, { status: 400 });
    }

    // If description is empty or too short, provide a fallback
    if (!description || description.length < 10) {
      description = `Join us for ${keywords}! This exciting event promises to be engaging and informative. Don't miss out!`;
    }

    return NextResponse.json({ description }, { status: 200 });
  } catch (err) {
    console.error('AI generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate description', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

