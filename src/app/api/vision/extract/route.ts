import { NextResponse } from 'next/server';
import { openRouterChatCompletions } from '@/lib/openrouter/client';
import { VISION_EXTRACT_SYSTEM, visionExtractUserPrompt } from '@/lib/openrouter/prompts';
import type { CardIdentity, CardLanguage, CardVariant } from '@/lib/types';

export const runtime = 'nodejs';

function isCardLanguage(v: unknown): v is CardLanguage {
  return v === 'ja' || v === 'en' || v === 'unknown';
}

function isCardVariant(v: unknown): v is CardVariant {
  return v === 'standard' || v === 'parallel';
}

function toCardIdentity(value: unknown): CardIdentity {
  const v = (value ?? {}) as Record<string, unknown>;

  return {
    cardCode: typeof v.cardCode === 'string' ? v.cardCode : '',
    cardName: typeof v.cardName === 'string' ? v.cardName : '',
    setCode: typeof v.setCode === 'string' ? v.setCode : null,
    rarity: typeof v.rarity === 'string' ? v.rarity : null,
    variant: isCardVariant(v.variant) ? v.variant : null,
    language: isCardLanguage(v.language) ? v.language : 'unknown',
    confidence: typeof v.confidence === 'number' ? v.confidence : 0,
    ambiguity: typeof v.ambiguity === 'boolean' ? v.ambiguity : false
  };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;

  const content = await openRouterChatCompletions({
    model: 'qwen/qwen2.5-vl-72b-instruct',
    messages: [
      { role: 'system', content: VISION_EXTRACT_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: visionExtractUserPrompt() },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 502 });
  }

  const identity = toCardIdentity(parsed);
  return NextResponse.json(identity);
}
