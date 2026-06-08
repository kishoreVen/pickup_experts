import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GameMode } from '@/lib/types';
import { renderPrompt } from '@/lib/renderPrompt';

export async function POST(request: NextRequest) {
  try {
    const { gameMode = '5v5' } = await request.json() as { gameMode?: GameMode };

    const anthropicApiKey = request.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'No API key configured.' },
        { status: 503 },
      );
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });

    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system:     renderPrompt('random-query.njk', { gameMode }),
      messages:   [{ role: 'user', content: `Give me a unique ${gameMode} play.` }],
    });

    const block = msg.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response');

    return NextResponse.json({ query: block.text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate random query';
    console.error('[random-query]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
