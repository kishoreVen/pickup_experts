import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { Strategy } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const SYSTEM_PROMPT = `You are a professional soccer tactics analyst. Convert a play description into an animated strategy.

Return ONLY valid JSON — no markdown fences, no explanation. Match this exact shape:
{
  "title": "Strategy name (max 40 chars)",
  "description": "One-sentence summary (max 100 chars)",
  "duration": 8000,
  "homePlayers": [
    { "id": "h1", "number": 9, "role": "ST", "keyframes": [{"time": 0, "x": 0.55, "y": 0.50}, {"time": 4000, "x": 0.75, "y": 0.35}] }
  ],
  "awayPlayers": [
    { "id": "a1", "number": 9, "role": "ST", "keyframes": [{"time": 0, "x": 0.55, "y": 0.50}] }
  ],
  "ball": {
    "keyframes": [
      {"time": 0, "x": 0.50, "y": 0.50},
      {"time": 3000, "x": 0.70, "y": 0.35, "event": "pass"}
    ]
  }
}

COORDINATE SYSTEM:
- x: 0.0 = left goal line, 1.0 = right goal line
- y: 0.0 = top touchline, 1.0 = bottom touchline
- HOME attacks RIGHT (toward x=1.0), starts in left half (x < 0.5)
- AWAY attacks LEFT (toward x=0.0), starts in right half (x > 0.5)
- Home GK: x ≈ 0.04 · Away GK: x ≈ 0.96
- Penalty areas: x=0 to 0.157 (home) and x=0.843 to 1.0 (away)

ROLES: GK CB LB RB LWB RWB CDM CM CAM LM RM LW RW SS ST CF

RULES:
- Include 9–11 players per team; always include one GK each
- Player IDs: home = "h1"…"h11", away = "a1"…"a11"
- duration: 5000–12000 ms
- First keyframe per player must be time=0
- Clamp positions: x 0.02–0.98, y 0.04–0.96
- Ball keyframes must spatially match the player holding/kicking it
- event types: "pass" | "shot" | "cross" | "dribble" | "clearance"
- Create smooth, realistic paths with appropriate spacing in time
- Attacking players should make runs into space; defenders should track runners`;

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

const MAX_GENERATIONS_PER_MONTH = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, existingStrategy } = body as { prompt: string; existingStrategy?: Strategy };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // ── Determine API key ────────────────────────────────────────────────────
    // Priority 1: user-supplied key from header
    const userApiKey = request.headers.get('x-api-key');

    let anthropicApiKey: string | undefined;

    if (userApiKey) {
      // User is supplying their own key — allow without auth
      anthropicApiKey = userApiKey;
    } else {
      // Priority 2: server key — only if user is authenticated + pro
      const supabase = await getSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          {
            error: 'UNAUTHENTICATED',
            message: 'Sign in and subscribe to Pro, or provide your own Anthropic API key in Settings.',
          },
          { status: 402 }
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, generations_used, generations_reset_at')
        .eq('id', user.id)
        .single();

      if (!profile || profile.subscription_tier !== 'pro') {
        return NextResponse.json(
          {
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Upgrade to Pro to use our AI key, or add your own Anthropic API key in Settings.',
          },
          { status: 402 }
        );
      }

      // Reset monthly counter if needed
      const resetAt = new Date(profile.generations_reset_at);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let generationsUsed = profile.generations_used as number;

      if (resetAt < thisMonthStart) {
        // New month — reset counter
        await supabase
          .from('profiles')
          .update({ generations_used: 0, generations_reset_at: thisMonthStart.toISOString() })
          .eq('id', user.id);
        generationsUsed = 0;
      }

      if (generationsUsed >= MAX_GENERATIONS_PER_MONTH) {
        return NextResponse.json(
          {
            error: 'LIMIT_REACHED',
            message: `You've used all ${MAX_GENERATIONS_PER_MONTH} generations this month. Add your own API key to continue.`,
          },
          { status: 402 }
        );
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: 'Server API key not configured.' },
          { status: 503 }
        );
      }

      anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      // Increment usage
      await supabase
        .from('profiles')
        .update({ generations_used: generationsUsed + 1 })
        .eq('id', user.id);
    }

    // ── Call Claude ──────────────────────────────────────────────────────────
    const userMessage = existingStrategy
      ? `Refine this existing soccer strategy.\n\nRefinement request: ${prompt}\n\nCurrent strategy JSON:\n${JSON.stringify(existingStrategy, null, 2)}`
      : `Create an animated soccer strategy for: ${prompt}`;

    const client = new Anthropic({ apiKey: anthropicApiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
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
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ strategy });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate strategy';
    console.error('[generate-strategy]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
