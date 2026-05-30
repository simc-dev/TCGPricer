# CardScout MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Next.js PWA that scans a TCG card photo, extracts identity via OpenRouter VLM, fetches pricing from Carousell/Mercari/PriceCharting/Yuyutei, computes Buy/Sell suggestions, and appends a traceable row to Google Sheets.

**Architecture:** One Next.js app that serves both the mobile UI and server-side API routes. API routes call OpenRouter + external pricing services and return normalized quotes + explanations.

**Tech Stack:** Next.js (App Router) + TypeScript, server-side fetch, minimal UI components, Vitest for unit tests.

---

## File Structure (Target)

**Create**
- `package.json` (via scaffold)
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/scan/page.tsx`
- `src/app/batch/page.tsx`
- `src/app/api/vision/extract/route.ts`
- `src/app/api/pricing/quote/route.ts`
- `src/app/api/sheets/append/route.ts`
- `src/lib/env.ts`
- `src/lib/types.ts`
- `src/lib/fx.ts`
- `src/lib/pricing/math.ts`
- `src/lib/pricing/benchmark.ts`
- `src/lib/pricing/notes.ts`
- `src/lib/openrouter/client.ts`
- `src/lib/openrouter/prompts.ts`
- `src/lib/apify/client.ts`
- `src/lib/pricecharting/client.ts`
- `src/lib/yuyutei/scrape.ts`
- `src/lib/google/sheets.ts`
- `src/lib/carousell/normalize.ts`
- `src/lib/mercari/normalize.ts`
- `src/lib/bait/parse.ts`
- `src/components/ScanCapture.tsx`
- `src/components/VerifyCard.tsx`
- `src/components/ModeToggle.tsx`
- `src/components/ConditionToggle.tsx`
- `src/components/ApprovalGate.tsx`
- `src/components/BatchQueue.tsx`
- `src/app/manifest.ts`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `vitest.config.ts`
- `src/lib/pricing/math.test.ts`
- `src/lib/pricing/benchmark.test.ts`
- `src/lib/bait/parse.test.ts`
- `src/lib/yuyutei/scrape.test.ts`

---

## Task 1: Scaffold Next.js app (TypeScript + App Router)

**Files:**
- Create: project scaffold files (Next.js)

- [ ] **Step 1: Scaffold Next.js (non-interactive)**

Run:

```powershell
npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*"
```

Expected: a Next.js project with `src/app` present.

- [ ] **Step 2: Add Vitest**

Run:

```powershell
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add `vitest.config.ts`**

Create `C:\dev\Project-Trae\vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    coverage: { provider: 'v8' }
  }
});
```

- [ ] **Step 4: Add test scripts**

Modify `package.json` to include:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run test:run
```

Expected: PASS (0 tests).

---

## Task 2: Add env loader (server-only) and core types

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/types.ts`
- Test: `src/lib/env.test.ts` (optional)

- [ ] **Step 1: Create `src/lib/env.ts`**

```ts
export type Env = {
  openRouterApiKey: string;
  apifyToken: string;
  apifyCarousellActorId: string;
  apifyMercariActorId: string;
  priceChartingToken: string;
  googleSheetsSpreadsheetId: string;
  googleSheetsTabName: string;
  googleServiceAccountJsonBase64: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getEnv(): Env {
  return {
    openRouterApiKey: requireEnv('OPEN_ROUTER_API_KEY'),
    apifyToken: requireEnv('APIFY_TOKEN'),
    apifyCarousellActorId: requireEnv('APIFY_CAROUSELL_ACTOR_ID'),
    apifyMercariActorId: requireEnv('APIFY_MERCARI_ACTOR_ID'),
    priceChartingToken: requireEnv('PRICECHARTING_TOKEN'),
    googleSheetsSpreadsheetId: requireEnv('GOOGLE_SHEETS_SPREADSHEET_ID'),
    googleSheetsTabName: requireEnv('GOOGLE_SHEETS_TAB_NAME'),
    googleServiceAccountJsonBase64: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64')
  };
}
```

- [ ] **Step 2: Create `src/lib/types.ts`**

```ts
export type PricingMode = 'buy' | 'sell';
export type CardVariant = 'standard' | 'parallel';
export type CardLanguage = 'ja' | 'en' | 'unknown';
export type Condition = 'nm' | 'lp' | 'mp';

export type CardIdentity = {
  cardCode: string;
  cardName: string;
  setCode: string | null;
  rarity: string | null;
  variant: CardVariant | null;
  language: CardLanguage;
  confidence: number;
  ambiguity: boolean;
};

export type PriceSource = 'carousell' | 'mercari' | 'pricecharting' | 'yuyutei';
export type Currency = 'SGD' | 'JPY' | 'USD';

export type PriceObservation = {
  source: PriceSource;
  currency: Currency;
  value: number;
  count?: number;
  newestTimestamp?: string;
  notes?: string;
};

export type BenchmarkSource = PriceSource;

export type PricingDecision = {
  benchmarkSource: BenchmarkSource;
  benchmarkValue: number;
  benchmarkCurrency: Currency;
  benchmarkExplanation: string;
};

export type PricingInputs = {
  fxJpyToSgd: number;
  buylistMultiplier: number;
  buyRounding: 0.5 | 1;
  condition: Condition | null;
};

export type SuggestedPrices = {
  buy: number | null;
  sell: number | null;
};

export type QuoteResponse = {
  identity: CardIdentity;
  observations: PriceObservation[];
  decision: PricingDecision | null;
  suggested: SuggestedPrices;
  manualApprovalRequired: boolean;
  manualApprovalReasons: string[];
};
```

- [ ] **Step 3: Verify build**

Run:

```powershell
npm run build
```

Expected: PASS.

---

## Task 3: Pricing math (Buy/Sell) with unit tests

**Files:**
- Create: `src/lib/pricing/math.ts`
- Test: `src/lib/pricing/math.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/pricing/math.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { roundToIncrement, computeBuyPrice, computeSellPrice } from './math';

describe('roundToIncrement', () => {
  it('rounds to nearest 0.5', () => {
    expect(roundToIncrement(1.24, 0.5)).toBe(1);
    expect(roundToIncrement(1.25, 0.5)).toBe(1.5);
    expect(roundToIncrement(1.74, 0.5)).toBe(1.5);
    expect(roundToIncrement(1.75, 0.5)).toBe(2);
  });

  it('rounds to nearest 1.0', () => {
    expect(roundToIncrement(18.3, 1)).toBe(18);
    expect(roundToIncrement(18.5, 1)).toBe(19);
  });
});

describe('computeBuyPrice', () => {
  it('applies buylist multiplier and rounds', () => {
    expect(computeBuyPrice({ baseSgd: 10, buylistMultiplier: 0.6, rounding: 0.5 })).toBe(6);
    expect(computeBuyPrice({ baseSgd: 10, buylistMultiplier: 0.65, rounding: 1 })).toBe(7);
  });
});

describe('computeSellPrice', () => {
  it('applies condition discount and psychological rounding', () => {
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'nm' })).toBe(18.9);
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'lp' })).toBe(16.9);
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'mp' })).toBe(14.9);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

Run:

```powershell
npm run test:run -- src/lib/pricing/math.test.ts
```

Expected: FAIL (missing exports).

- [ ] **Step 3: Implement `src/lib/pricing/math.ts`**

```ts
import type { Condition } from '@/lib/types';

export function roundToIncrement(value: number, inc: 0.5 | 1): number {
  const units = Math.round(value / inc);
  return Number((units * inc).toFixed(2));
}

export function computeBuyPrice(input: {
  baseSgd: number;
  buylistMultiplier: number;
  rounding: 0.5 | 1;
}): number {
  return roundToIncrement(input.baseSgd * input.buylistMultiplier, input.rounding);
}

function conditionDiscount(condition: Condition): number {
  if (condition === 'nm') return 0;
  if (condition === 'lp') return 0.1;
  return 0.2;
}

function psychRound(value: number): number {
  const floor = Math.floor(value);
  const frac = value - floor;
  if (frac <= 0.5) return floor + 0.9;
  return floor + 0.9;
}

export function computeSellPrice(input: { baseSgd: number; condition: Condition }): number {
  const discounted = input.baseSgd * (1 - conditionDiscount(input.condition));
  const rounded = psychRound(discounted);
  return Number(rounded.toFixed(2));
}
```

- [ ] **Step 4: Run tests (expect pass)**

Run:

```powershell
npm run test:run -- src/lib/pricing/math.test.ts
```

Expected: PASS.

---

## Task 4: Bait listing parsing (text model + deterministic fallback)

**Files:**
- Create: `src/lib/bait/parse.ts`
- Test: `src/lib/bait/parse.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/bait/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractSgdCandidates, median } from './parse';

describe('extractSgdCandidates', () => {
  it('extracts SGD numeric candidates', () => {
    expect(extractSgdCandidates('Selling for $120, meetup only')).toEqual([120]);
    expect(extractSgdCandidates('$1 placeholder, actual 85')).toEqual([1, 85]);
  });
});

describe('median', () => {
  it('computes median for odd/even counts', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

Run:

```powershell
npm run test:run -- src/lib/bait/parse.test.ts
```

- [ ] **Step 3: Implement deterministic helpers**

Create `src/lib/bait/parse.ts`:

```ts
export function extractSgdCandidates(text: string): number[] {
  const matches = text.match(/\$?\s?(\d{1,5})(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches
    .map(m => Number(m.replace(/[^\d.]/g, '')))
    .filter(n => Number.isFinite(n));
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
```

- [ ] **Step 4: Run tests (expect pass)**

Run:

```powershell
npm run test:run -- src/lib/bait/parse.test.ts
```

Expected: PASS.

---

## Task 5: OpenRouter client (vision + text) and prompts

**Files:**
- Create: `src/lib/openrouter/client.ts`
- Create: `src/lib/openrouter/prompts.ts`

- [ ] **Step 1: Create prompts**

Create `src/lib/openrouter/prompts.ts`:

```ts
export const VISION_EXTRACT_SYSTEM = `You extract a trading card identity from a photo.
Return strict JSON only.`;

export function visionExtractUserPrompt(): string {
  return `Return JSON with keys:
cardCode (string), cardName (string), setCode (string|null), rarity (string|null),
language ("ja"|"en"|"unknown"), confidence (number 0..1), ambiguity (boolean).`;
}

export const CAROUSELL_PARSE_SYSTEM = `You extract the real SGD selling price from listing text.
Ignore bait placeholders like 1 or 9999 when evidence suggests otherwise. Return strict JSON only.`;

export function carousellParseUserPrompt(listingText: string): string {
  return `Listing text:
${listingText}

Return JSON: { "priceSgd": number|null, "isBait": boolean, "reason": string }`;
}
```

- [ ] **Step 2: Create OpenRouter HTTP client**

Create `src/lib/openrouter/client.ts`:

```ts
import { getEnv } from '@/lib/env';

type OpenRouterMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> };

export async function openRouterChatCompletions(input: {
  model: string;
  messages: OpenRouterMessage[];
}): Promise<string> {
  const env = getEnv();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenRouter: missing content');
  return content;
}
```

---

## Task 6: Vision extract API route

**Files:**
- Create: `src/app/api/vision/extract/route.ts`

- [ ] **Step 1: Implement route**

Create `src/app/api/vision/extract/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { openRouterChatCompletions } from '@/lib/openrouter/client';
import { VISION_EXTRACT_SYSTEM, visionExtractUserPrompt } from '@/lib/openrouter/prompts';
import type { CardIdentity } from '@/lib/types';

export const runtime = 'nodejs';

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

  const parsed = JSON.parse(content) as CardIdentity;
  return NextResponse.json(parsed);
}
```

---

## Task 7: Apify clients + normalization for Carousell/Mercari

**Files:**
- Create: `src/lib/apify/client.ts`
- Create: `src/lib/carousell/normalize.ts`
- Create: `src/lib/mercari/normalize.ts`

- [ ] **Step 1: Apify client**

Create `src/lib/apify/client.ts`:

```ts
import { getEnv } from '@/lib/env';

export async function apifyRunActor(input: { actorId: string; runInput: any }): Promise<any> {
  const env = getEnv();
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(input.actorId)}/runs?token=${encodeURIComponent(env.apifyToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.runInput)
  });
  if (!res.ok) throw new Error(`Apify run failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json;
}

export async function apifyGetDatasetItems(input: { datasetId: string; limit: number }): Promise<any[]> {
  const env = getEnv();
  const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(input.datasetId)}/items?clean=true&limit=${input.limit}&token=${encodeURIComponent(env.apifyToken)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as any[];
}
```

- [ ] **Step 2: Carousell normalize**

Create `src/lib/carousell/normalize.ts`:

```ts
import type { PriceObservation } from '@/lib/types';

export type CarousellListing = {
  title?: string;
  price?: number | string;
  description?: string;
  createdAt?: string;
};

export function carousellToObservation(input: { pricesSgd: number[]; newestTimestamp?: string }): PriceObservation {
  const sorted = [...input.pricesSgd].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length === 0 ? NaN : sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    source: 'carousell',
    currency: 'SGD',
    value,
    count: sorted.length,
    newestTimestamp: input.newestTimestamp,
    notes: 'median of clean listings'
  };
}
```

- [ ] **Step 3: Mercari normalize**

Create `src/lib/mercari/normalize.ts`:

```ts
import type { PriceObservation } from '@/lib/types';

export function mercariToObservation(input: { jpyValues: number[]; newestTimestamp?: string }): PriceObservation {
  const sorted = [...input.jpyValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length === 0 ? NaN : sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    source: 'mercari',
    currency: 'JPY',
    value,
    count: sorted.length,
    newestTimestamp: input.newestTimestamp,
    notes: 'median of comps'
  };
}
```

---

## Task 8: PriceCharting client (rate-limited)

**Files:**
- Create: `src/lib/pricecharting/client.ts`

- [ ] **Step 1: Implement**

Create `src/lib/pricecharting/client.ts`:

```ts
import { getEnv } from '@/lib/env';
import type { PriceObservation } from '@/lib/types';

let lastCallAt = 0;

async function rateLimit1rps() {
  const now = Date.now();
  const waitMs = Math.max(0, 1000 - (now - lastCallAt));
  if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
  lastCallAt = Date.now();
}

export async function priceChartingFetchByCode(cardCode: string): Promise<PriceObservation | null> {
  const env = getEnv();
  await rateLimit1rps();
  const url = `https://www.pricecharting.com/api/product?t=${encodeURIComponent(env.priceChartingToken)}&id=${encodeURIComponent(cardCode)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const pricePennies = Number(json?.['loose-price'] ?? json?.['price'] ?? NaN);
  if (!Number.isFinite(pricePennies)) return null;
  const usd = pricePennies / 100;
  return { source: 'pricecharting', currency: 'USD', value: usd };
}
```

---

## Task 9: Yuyutei scraping + tests (HTML fixture)

**Files:**
- Install: `cheerio`
- Create: `src/lib/yuyutei/scrape.ts`
- Test: `src/lib/yuyutei/scrape.test.ts`

- [ ] **Step 1: Install cheerio**

Run:

```powershell
npm install cheerio
```

- [ ] **Step 2: Write failing test**

Create `src/lib/yuyutei/scrape.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseYuyuteiHtml } from './scrape';

describe('parseYuyuteiHtml', () => {
  it('extracts price and inStock', () => {
    const html = `<html><body><div class="price">12345</div><div class="stock in">in</div></body></html>`;
    expect(parseYuyuteiHtml(html)).toEqual({ priceJpy: 12345, inStock: true });
  });

  it('detects out of stock', () => {
    const html = `<html><body><div class="price">999</div><div class="stock out">out</div></body></html>`;
    expect(parseYuyuteiHtml(html)).toEqual({ priceJpy: 999, inStock: false });
  });
});
```

- [ ] **Step 3: Implement parser + fetch**

Create `src/lib/yuyutei/scrape.ts`:

```ts
import * as cheerio from 'cheerio';
import type { PriceObservation } from '@/lib/types';

export function parseYuyuteiHtml(html: string): { priceJpy: number; inStock: boolean } | null {
  const $ = cheerio.load(html);
  const priceText = $('.price').first().text().trim();
  const priceJpy = Number(priceText.replace(/[^\d]/g, ''));
  if (!Number.isFinite(priceJpy)) return null;
  const stockText = $('.stock').first().text().toLowerCase();
  const inStock = stockText.includes('in') && !stockText.includes('out');
  return { priceJpy, inStock };
}

export async function yuyuteiFetch(cardCode: string): Promise<PriceObservation | null> {
  const url = `https://yuyu-tei.jp/sell/${encodeURIComponent(cardCode)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const html = await res.text();
  const parsed = parseYuyuteiHtml(html);
  if (!parsed) return null;
  return {
    source: 'yuyutei',
    currency: 'JPY',
    value: parsed.priceJpy,
    notes: parsed.inStock ? 'in stock' : 'oos'
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:run -- src/lib/yuyutei/scrape.test.ts
```

Expected: PASS.

---

## Task 10: FX rate fetch + caching

**Files:**
- Create: `src/lib/fx.ts`

- [ ] **Step 1: Implement simple FX cache**

Create `src/lib/fx.ts`:

```ts
let cached: { rate: number; expiresAt: number } | null = null;

export async function getJpyToSgdRate(): Promise<number> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.rate;

  const res = await fetch('https://api.exchangerate.host/latest?base=JPY&symbols=SGD');
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const json = (await res.json()) as any;
  const rate = Number(json?.rates?.SGD);
  if (!Number.isFinite(rate)) throw new Error('FX rate missing');
  cached = { rate, expiresAt: now + 15 * 60 * 1000 };
  return rate;
}
```

---

## Task 11: Benchmark selection + manual approval gate

**Files:**
- Create: `src/lib/pricing/benchmark.ts`
- Test: `src/lib/pricing/benchmark.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/pricing/benchmark.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { selectBenchmark, manualApprovalGate } from './benchmark';
import type { PriceObservation } from '@/lib/types';

function obs(partial: Partial<PriceObservation>): PriceObservation {
  return { source: 'mercari', currency: 'JPY', value: 1, ...partial };
}

describe('selectBenchmark', () => {
  it('uses carousell when comps >= 3 and newest within 30 days', () => {
    const newest = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const observations = [
      obs({ source: 'carousell', currency: 'SGD', value: 100, count: 3, newestTimestamp: newest })
    ];
    const decision = selectBenchmark(observations);
    expect(decision?.benchmarkSource).toBe('carousell');
  });

  it('falls back to mercari otherwise', () => {
    const newest = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const observations = [
      obs({ source: 'carousell', currency: 'SGD', value: 100, count: 3, newestTimestamp: newest }),
      obs({ source: 'mercari', currency: 'JPY', value: 1234, count: 5 })
    ];
    const decision = selectBenchmark(observations);
    expect(decision?.benchmarkSource).toBe('mercari');
  });
});

describe('manualApprovalGate', () => {
  it('blocks when price > 100', () => {
    const g = manualApprovalGate({ suggestedSgd: 101, confidence: 1, ambiguity: false });
    expect(g.required).toBe(true);
  });

  it('blocks when confidence < 0.9', () => {
    const g = manualApprovalGate({ suggestedSgd: 10, confidence: 0.89, ambiguity: false });
    expect(g.required).toBe(true);
  });

  it('blocks when ambiguity', () => {
    const g = manualApprovalGate({ suggestedSgd: 10, confidence: 1, ambiguity: true });
    expect(g.required).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

Create `src/lib/pricing/benchmark.ts`:

```ts
import type { PriceObservation, PricingDecision } from '@/lib/types';

function withinDays(iso: string, days: number): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export function selectBenchmark(observations: PriceObservation[]): PricingDecision | null {
  const car = observations.find(o => o.source === 'carousell');
  if (car && (car.count ?? 0) >= 3 && (car.newestTimestamp ? withinDays(car.newestTimestamp, 30) : false)) {
    return {
      benchmarkSource: 'carousell',
      benchmarkValue: car.value,
      benchmarkCurrency: car.currency,
      benchmarkExplanation: 'Carousell median from >=3 clean listings within 30 days'
    };
  }

  const mercari = observations.find(o => o.source === 'mercari');
  if (mercari) {
    return {
      benchmarkSource: 'mercari',
      benchmarkValue: mercari.value,
      benchmarkCurrency: mercari.currency,
      benchmarkExplanation: 'Carousell comps insufficient; Mercari fallback'
    };
  }

  const yuyutei = observations.find(o => o.source === 'yuyutei' && o.notes === 'in stock');
  if (yuyutei) {
    return {
      benchmarkSource: 'yuyutei',
      benchmarkValue: yuyutei.value,
      benchmarkCurrency: yuyutei.currency,
      benchmarkExplanation: 'Mercari unavailable; Yuyutei in-stock fallback'
    };
  }

  const pc = observations.find(o => o.source === 'pricecharting');
  if (pc) {
    return {
      benchmarkSource: 'pricecharting',
      benchmarkValue: pc.value,
      benchmarkCurrency: pc.currency,
      benchmarkExplanation: 'Last-resort fallback to PriceCharting'
    };
  }

  return null;
}

export function manualApprovalGate(input: { suggestedSgd: number; confidence: number; ambiguity: boolean }): {
  required: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.suggestedSgd > 100) reasons.push('price_gt_100');
  if (input.confidence < 0.9) reasons.push('confidence_lt_0_9');
  if (input.ambiguity) reasons.push('variant_ambiguity');
  return { required: reasons.length > 0, reasons };
}
```

- [ ] **Step 3: Run tests**

Run:

```powershell
npm run test:run -- src/lib/pricing/benchmark.test.ts
```

Expected: PASS.

---

## Task 12: Pricing quote API route (pull all sources, decide, suggest)

**Files:**
- Create: `src/app/api/pricing/quote/route.ts`
- Create: `src/lib/pricing/notes.ts`

- [ ] **Step 1: Create notes builder**

Create `src/lib/pricing/notes.ts`:

```ts
import type { PriceObservation, PricingDecision } from '@/lib/types';

export function buildNotes(input: { observations: PriceObservation[]; decision: PricingDecision | null }): string {
  if (!input.decision) return 'No benchmark available';
  const parts: string[] = [];
  parts.push(`Benchmark: ${input.decision.benchmarkSource}`);
  parts.push(input.decision.benchmarkExplanation);
  const y = input.observations.find(o => o.source === 'yuyutei');
  if (y && y.notes === 'oos') parts.push('Yuyutei OOS');
  const c = input.observations.find(o => o.source === 'carousell');
  if (c && (c.count ?? 0) > 0) parts.push(`Carousell comps: ${c.count}`);
  return parts.join('. ');
}
```

- [ ] **Step 2: Implement route skeleton**

Create `src/app/api/pricing/quote/route.ts`:

```ts
import { NextResponse } from 'next/server';
import type { CardIdentity, PricingInputs, QuoteResponse, PriceObservation, PricingMode, Condition } from '@/lib/types';
import { getJpyToSgdRate } from '@/lib/fx';
import { selectBenchmark, manualApprovalGate } from '@/lib/pricing/benchmark';
import { computeBuyPrice, computeSellPrice } from '@/lib/pricing/math';
import { buildNotes } from '@/lib/pricing/notes';

export const runtime = 'nodejs';

type QuoteRequest = {
  identity: CardIdentity;
  mode: PricingMode;
  condition: Condition | null;
  inputs: Omit<PricingInputs, 'fxJpyToSgd'>;
};

function normalizeToSgd(input: { value: number; currency: 'SGD' | 'JPY' | 'USD'; fxJpyToSgd: number }): number {
  if (input.currency === 'SGD') return input.value;
  if (input.currency === 'JPY') return input.value * input.fxJpyToSgd;
  return input.value;
}

export async function POST(req: Request) {
  const body = (await req.json()) as QuoteRequest;

  const fxJpyToSgd = await getJpyToSgdRate();

  const observations: PriceObservation[] = [];
  // Implementation plan: fill in source fetchers and push observations

  const decision = selectBenchmark(observations);
  const baseSgd =
    decision ? normalizeToSgd({ value: decision.benchmarkValue, currency: decision.benchmarkCurrency, fxJpyToSgd }) : NaN;

  const suggestedBuy = Number.isFinite(baseSgd)
    ? computeBuyPrice({ baseSgd, buylistMultiplier: body.inputs.buylistMultiplier, rounding: body.inputs.buyRounding })
    : null;
  const suggestedSell = Number.isFinite(baseSgd) && body.condition
    ? computeSellPrice({ baseSgd, condition: body.condition })
    : body.mode === 'sell'
      ? null
      : null;

  const suggestedSgd = body.mode === 'buy' ? suggestedBuy : suggestedSell;
  const gate = manualApprovalGate({
    suggestedSgd: suggestedSgd ?? 0,
    confidence: body.identity.confidence,
    ambiguity: body.identity.ambiguity
  });

  const resp: QuoteResponse = {
    identity: body.identity,
    observations,
    decision,
    suggested: { buy: suggestedBuy, sell: suggestedSell },
    manualApprovalRequired: gate.required,
    manualApprovalReasons: gate.reasons
  };

  const notes = buildNotes({ observations, decision });
  return NextResponse.json({ ...resp, notes });
}
```

---

## Task 13: Google Sheets append integration

**Files:**
- Install: `googleapis`
- Create: `src/lib/google/sheets.ts`
- Create: `src/app/api/sheets/append/route.ts`

- [ ] **Step 1: Install**

Run:

```powershell
npm install googleapis
```

- [ ] **Step 2: Implement sheets client**

Create `src/lib/google/sheets.ts`:

```ts
import { google } from 'googleapis';
import { getEnv } from '@/lib/env';

function getAuth() {
  const env = getEnv();
  const json = Buffer.from(env.googleServiceAccountJsonBase64, 'base64').toString('utf8');
  const creds = JSON.parse(json);
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

export async function appendRow(values: Array<string | number | null>): Promise<{ updatedRange: string }> {
  const env = getEnv();
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${env.googleSheetsTabName}!A1`;
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetsSpreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
  return { updatedRange: String(res.data.updates?.updatedRange ?? '') };
}
```

- [ ] **Step 3: Implement route**

Create `src/app/api/sheets/append/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { appendRow } from '@/lib/google/sheets';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json()) as { values: Array<string | number | null> };
  if (!Array.isArray(body.values)) return NextResponse.json({ error: 'values must be array' }, { status: 400 });
  const result = await appendRow(body.values);
  return NextResponse.json(result);
}
```

---

## Task 14: UI pages (Scan + Verify + Batch)

**Files:**
- Create: `src/app/scan/page.tsx`
- Create: `src/app/batch/page.tsx`
- Create: `src/components/*`

- [ ] **Step 1: Minimal scan capture component**

Create `src/components/ScanCapture.tsx`:

```tsx
'use client';

import { useRef } from 'react';

export function ScanCapture(props: { onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onFile(f);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verification component**

Create `src/components/VerifyCard.tsx`:

```tsx
'use client';

import type { CardIdentity, QuoteResponse, PricingMode, Condition } from '@/lib/types';

export function VerifyCard(props: {
  identity: CardIdentity;
  quote: QuoteResponse | null;
  mode: PricingMode;
  condition: Condition | null;
  onMode: (m: PricingMode) => void;
  onCondition: (c: Condition) => void;
  onRescan: () => void;
  onSave: () => void;
}) {
  const suggested = props.mode === 'buy' ? props.quote?.suggested.buy : props.quote?.suggested.sell;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div>{props.identity.cardCode}</div>
        <div>{props.identity.cardName}</div>
        <div>{props.identity.rarity}</div>
        <div>Confidence: {Math.round(props.identity.confidence * 100)}%</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => props.onMode('buy')}>Buy</button>
        <button onClick={() => props.onMode('sell')}>Sell</button>
      </div>
      {props.mode === 'sell' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => props.onCondition('nm')}>NM</button>
          <button onClick={() => props.onCondition('lp')}>LP</button>
          <button onClick={() => props.onCondition('mp')}>MP</button>
        </div>
      )}
      <div>Suggested: {suggested ?? '-'}</div>
      {props.quote?.manualApprovalRequired && (
        <div>Manual approval required: {props.quote.manualApprovalReasons.join(', ')}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={props.onRescan}>Rescan</button>
        <button onClick={props.onSave}>Save to Sheet</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Scan page wiring**

Create `src/app/scan/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ScanCapture } from '@/components/ScanCapture';
import { VerifyCard } from '@/components/VerifyCard';
import type { CardIdentity, PricingMode, Condition, QuoteResponse } from '@/lib/types';

async function extractIdentity(file: File): Promise<CardIdentity> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/vision/extract', { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as CardIdentity;
}

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [identity, setIdentity] = useState<CardIdentity | null>(null);
  const [mode, setMode] = useState<PricingMode>('buy');
  const [condition, setCondition] = useState<Condition>('nm');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  if (!identity) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Scan</h1>
        <ScanCapture
          onFile={async (f) => {
            setFile(f);
            const id = await extractIdentity(f);
            setIdentity(id);
          }}
        />
      </main>
    );
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>Verify</h1>
      <VerifyCard
        identity={identity}
        quote={quote}
        mode={mode}
        condition={condition}
        onMode={setMode}
        onCondition={setCondition}
        onRescan={() => {
          setFile(null);
          setIdentity(null);
          setQuote(null);
        }}
        onSave={() => {}}
      />
    </main>
  );
}
```

---

## Task 15: Finish quote pipeline (source fetchers + benchmark + notes)

**Files:**
- Modify: `src/app/api/pricing/quote/route.ts`
- Modify/Create: source fetchers as needed

- [ ] **Step 1: Implement Carousell fetcher**
- [ ] **Step 2: Implement Mercari fetcher**
- [ ] **Step 3: Call PriceCharting + Yuyutei**
- [ ] **Step 4: Populate `observations[]` and ensure `selectBenchmark` works**
- [ ] **Step 5: Add Notes to response and ensure it matches spec wording**

Verification:

```powershell
npm run build
```

---

## Task 16: Save-to-Sheets wiring + manual approval UI

**Files:**
- Modify: `src/components/VerifyCard.tsx`
- Modify: `src/app/scan/page.tsx`

- [ ] **Step 1: When “Save to Sheet” pressed, if gate required, require second confirmation**
- [ ] **Step 2: Build sheet row using Minimal schema ordering**
- [ ] **Step 3: Call `POST /api/sheets/append`**

---

## Task 17: Batch mode UI (queue + per-scan verification + auto-save on confirm)

**Files:**
- Create: `src/components/BatchQueue.tsx`
- Create: `src/app/batch/page.tsx`

- [ ] **Step 1: Implement in-memory queue state**
- [ ] **Step 2: Each scan opens Verify UI; confirm triggers save; rescan/edit does not save**
- [ ] **Step 3: Provide toggle from Scan (A) to Batch (B)**

---

## Task 18: Final verification

- [ ] **Step 1: Run unit tests**

```powershell
npm run test:run
```

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

- [ ] **Step 3: Run dev server**

```powershell
npm run dev
```

Expected: Scan page loads on mobile, can upload photo, returns identity, shows verify UI.
