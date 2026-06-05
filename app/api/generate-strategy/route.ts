import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GameMode, Strategy } from '@/lib/types';

const MODE_RULES: Record<GameMode, { players: string; roles: string; area: string }> = {
  '5v5': {
    players: 'Exactly 6 players per team: 1 GK + 5 outfield (e.g. 2 CB, 1 CM, 2 ST).',
    roles:   'GK CB CM ST — keep it simple',
    area:    'Field is 40m×25m. Keep play compact: x 0.05–0.95, y 0.05–0.95. Small goal area at x<0.12 (home) and x>0.88 (away).',
  },
  '3v3': {
    players: 'Exactly 4 players per team: 1 GK + 3 outfield (e.g. 1 CB, 1 CM, 1 ST).',
    roles:   'GK CB CM ST',
    area:    'Field is 30m×20m. Keep play very compact: x 0.08–0.92, y 0.08–0.92. Tight spaces.',
  },
  '1v1': {
    players: 'Exactly 1 player per team — NO goalkeeper. Each player attacks the opponent\'s small goal.',
    roles:   'ST (one player per team)',
    area:    'Field is 20m×15m. Play is in the centre: x 0.15–0.85, y 0.15–0.85. Goals are small and centered.',
  },
};

function buildSystemPrompt(gameMode: GameMode): string {
  const r = MODE_RULES[gameMode];
  return `You are a soccer tactics analyst. Convert a play description into an animated small-sided strategy.

Return ONLY valid JSON — no markdown fences, no explanation. Match this exact shape:
{
  "title": "Strategy name (max 40 chars)",
  "description": "One-sentence summary (max 100 chars)",
  "duration": 8000,
  "homePlayers": [
    { "id": "h1", "number": 9, "role": "ST", "keyframes": [{"time": 0, "x": 0.35, "y": 0.50}, {"time": 4000, "x": 0.75, "y": 0.40}] }
  ],
  "awayPlayers": [
    { "id": "a1", "number": 9, "role": "ST", "keyframes": [{"time": 0, "x": 0.65, "y": 0.50}] }
  ],
  "ball": {
    "keyframes": [
      {"time": 0, "x": 0.35, "y": 0.50},
      {"time": 3000, "x": 0.70, "y": 0.40, "event": "pass"}
    ]
  }
}

COORDINATE SYSTEM:
- x: 0.0 = left goal line, 1.0 = right goal line
- y: 0.0 = top touchline, 1.0 = bottom touchline
- HOME attacks RIGHT (toward x=1.0), starts in left half (x < 0.5)
- AWAY attacks LEFT (toward x=0.0), starts in right half (x > 0.5)
- Home GK (if present): x ≈ 0.04 · Away GK (if present): x ≈ 0.96

GAME MODE: ${gameMode}
PLAYERS: ${r.players}
ROLES: ${r.roles}
FIELD: ${r.area}

RULES:
- Player IDs: home = "h1", "h2"…, away = "a1", "a2"…
- duration: 5000–10000 ms
- First keyframe per player must be time=0
- Clamp positions: x 0.02–0.98, y 0.04–0.96
- Ball keyframes must spatially match the player holding/kicking it
- event types: "pass" | "shot" | "cross" | "dribble" | "clearance"
- Create smooth, realistic paths with 3–5 keyframes per player
- Attacking players make runs into space; defenders track runners
- GOAL / SHOT ON TARGET: the ball's FINAL keyframe must be inside the goal mouth. Home team scores (attacks right): x=0.97, y=0.50. Away team scores (attacks left): x=0.03, y=0.50. Mark the second-to-last ball keyframe with event "shot".
- PASS / CROSS: ball path must go from the kicking player's position to the receiving player's position at the correct time`;
}

function extractJSON(text: string): unknown {
  // Direct parse
  try { return JSON.parse(text); } catch { /* continue */ }

  // Strip markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
  }

  // Grab the first top-level JSON object
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try { return JSON.parse(obj[0]); } catch { /* continue */ }
  }

  throw new Error('No valid JSON found in AI response');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, existingStrategy, gameMode = '5v5' } = body as { prompt: string; existingStrategy?: Strategy; gameMode?: GameMode };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // ── Determine API key ────────────────────────────────────────────────────
    // Priority 1: user-supplied key from Settings, Priority 2: server .env key
    const anthropicApiKey = request.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'No API key configured. Add your Anthropic API key in Settings.' },
        { status: 503 }
      );
    }

    // ── Call Claude ──────────────────────────────────────────────────────────
    const userMessage = existingStrategy
      ? `Refine this existing ${gameMode} strategy.\n\nRefinement request: ${prompt}\n\nCurrent strategy JSON:\n${JSON.stringify(existingStrategy, null, 2)}`
      : `Create an animated ${gameMode} strategy for: ${prompt}`;

    const client = new Anthropic({ apiKey: anthropicApiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(gameMode),
      messages: [{ role: 'user', content: userMessage }],
    });

    const firstBlock = message.content[0];
    if (firstBlock.type !== 'text') throw new Error('Unexpected response type from AI');

    const raw = extractJSON(firstBlock.text) as {
      title: string;
      description: string;
      duration: number;
      homePlayers: { id: string; number: number; role: string; keyframes: { time: number; x: number; y: number }[] }[];
      awayPlayers: { id: string; number: number; role: string; keyframes: { time: number; x: number; y: number }[] }[];
      ball: { keyframes: { time: number; x: number; y: number; event?: string }[] };
    };

    const strategy: Strategy = {
      id: `strategy_${Date.now()}`,
      title: raw.title,
      description: raw.description,
      duration: raw.duration,
      players: [
        ...(raw.homePlayers ?? []).map(p => ({ ...p, team: 'home' as const })),
        ...(raw.awayPlayers ?? []).map(p => ({ ...p, team: 'away' as const })),
      ],
      ball: {
        keyframes: raw.ball.keyframes.map(kf => ({
          ...kf,
          event: kf.event as 'pass' | 'shot' | 'cross' | 'dribble' | 'clearance' | undefined,
        })),
      },
      prompt,
      gameMode,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ strategy });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate strategy';
    console.error('[generate-strategy]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
