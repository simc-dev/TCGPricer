# Friendlier Advanced Pricing (Settings → Advanced) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Settings → Advanced pricing understandable by default (presets + one slider + plain labels) while preserving the existing underlying pricing settings and behavior.

**Architecture:** Introduce a small pure mapping module that converts “simple UI” (preset/slider) into the existing `AppSettings.advanced` fields, plus a UI-only localStorage key to remember Simple vs Expert view.

**Tech Stack:** Next.js app router (client page), React, Tailwind, Vitest.

---

## File/Module Plan

**Create**
- `src/lib/settings/advancedPricingUi.ts` (pure mapping + labels)
- `src/lib/settings/advancedPricingUi.test.ts`
- `src/lib/settings/uiStorage.ts` (UI-only localStorage helpers)
- `src/lib/settings/uiStorage.test.ts`

**Modify**
- `src/app/settings/page.tsx` (replace Advanced section UI; preserve storage save semantics)

---

### Task 1: Add pure “simple pricing” mapping module

**Files:**
- Create: `src/lib/settings/advancedPricingUi.ts`
- Test: `src/lib/settings/advancedPricingUi.test.ts`

- [ ] **Step 1: Write failing tests for preset anchors and slider interpolation**

Create `src/lib/settings/advancedPricingUi.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapSimpleToAdvanced, SIMPLE_PRESETS } from './advancedPricingUi';

describe('advancedPricingUi presets', () => {
  it('maps Margin preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'margin', t: 0 })).toEqual(SIMPLE_PRESETS.margin);
  });

  it('maps Balance preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.5 })).toEqual(SIMPLE_PRESETS.balance);
  });

  it('maps Volume preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'volume', t: 1 })).toEqual(SIMPLE_PRESETS.volume);
  });
});

describe('advancedPricingUi slider', () => {
  it('interpolates buylist multiplier', () => {
    const a = mapSimpleToAdvanced({ preset: 'balance', t: 0.25 });
    expect(a.buylistMultiplier).toBeGreaterThan(SIMPLE_PRESETS.margin.buylistMultiplier);
    expect(a.buylistMultiplier).toBeLessThan(SIMPLE_PRESETS.balance.buylistMultiplier);
  });

  it('uses $1 buy rounding for low t and $0.5 for higher t', () => {
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.2 }).buyRounding).toBe(1);
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.5 }).buyRounding).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run:

```bash
npm run test:run -- src/lib/settings/advancedPricingUi.test.ts
```

Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `advancedPricingUi.ts`**

Create `src/lib/settings/advancedPricingUi.ts`:

```ts
import type { AdvancedPricingSettings, SellRoundingPreset } from './types';

export type SimplePricingPreset = 'margin' | 'balance' | 'volume';

export const SIMPLE_PRESETS: Record<SimplePricingPreset, AdvancedPricingSettings> = {
  margin: {
    buylistMultiplier: 0.55,
    buyRounding: 1,
    conditionDiscounts: { nm: 0, lp: 0.05, mp: 0.1 },
    sellRoundingPreset: 'retail',
  },
  balance: {
    buylistMultiplier: 0.65,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.1, mp: 0.2 },
    sellRoundingPreset: 'retail',
  },
  volume: {
    buylistMultiplier: 0.75,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.15, mp: 0.25 },
    sellRoundingPreset: 'conservative',
  },
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpDiscounts(
  a: AdvancedPricingSettings['conditionDiscounts'],
  b: AdvancedPricingSettings['conditionDiscounts'],
  t: number,
): AdvancedPricingSettings['conditionDiscounts'] {
  return {
    nm: lerp(a.nm, b.nm, t),
    lp: lerp(a.lp, b.lp, t),
    mp: lerp(a.mp, b.mp, t),
  };
}

export function presetLabel(p: SimplePricingPreset): string {
  if (p === 'margin') return 'Margin';
  if (p === 'balance') return 'Balance';
  return 'Volume';
}

export function sellRoundingLabel(p: SellRoundingPreset): string {
  if (p === 'off') return 'Keep decimals';
  if (p === 'conservative') return 'Round to $0.50';
  return 'Round to $1.00';
}

export function buyRoundingLabel(v: 0.5 | 1): string {
  return v === 1 ? 'Round to $1.00' : 'Round to $0.50';
}

export function mapSimpleToAdvanced(input: { preset: SimplePricingPreset; t: number }): AdvancedPricingSettings {
  const t01 = clamp01(input.t);
  const left = t01 <= 0.5 ? SIMPLE_PRESETS.margin : SIMPLE_PRESETS.balance;
  const right = t01 <= 0.5 ? SIMPLE_PRESETS.balance : SIMPLE_PRESETS.volume;
  const localT = t01 <= 0.5 ? t01 / 0.5 : (t01 - 0.5) / 0.5;

  const buylistMultiplier = lerp(left.buylistMultiplier, right.buylistMultiplier, localT);
  const conditionDiscounts = lerpDiscounts(left.conditionDiscounts, right.conditionDiscounts, localT);

  const buyRounding: 0.5 | 1 = t01 < 0.33 ? 1 : 0.5;
  const sellRoundingPreset: SellRoundingPreset = t01 > 0.66 ? 'conservative' : 'retail';

  return {
    buylistMultiplier,
    buyRounding,
    conditionDiscounts,
    sellRoundingPreset,
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run:

```bash
npm run test:run -- src/lib/settings/advancedPricingUi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/advancedPricingUi.ts src/lib/settings/advancedPricingUi.test.ts
git commit -m "feat(settings): add simple advanced pricing mapping"
```

---

### Task 2: Add UI-only storage for Simple vs Expert view state

**Files:**
- Create: `src/lib/settings/uiStorage.ts`
- Test: `src/lib/settings/uiStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/settings/uiStorage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { getPricingUiMode, setPricingUiMode } from './uiStorage';

describe('uiStorage pricing mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to simple', () => {
    expect(getPricingUiMode()).toBe('simple');
  });

  it('persists mode', () => {
    setPricingUiMode('expert');
    expect(getPricingUiMode()).toBe('expert');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run:

```bash
npm run test:run -- src/lib/settings/uiStorage.test.ts
```

Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `uiStorage.ts`**

Create `src/lib/settings/uiStorage.ts`:

```ts
const KEY = 'tcgpricer:settings-ui:v1';

export type PricingUiMode = 'simple' | 'expert';

function getLocalStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
} | null {
  if (typeof window === 'undefined') return null;
  const ls = (window as unknown as { localStorage?: unknown }).localStorage;
  const v = ls as { getItem?: unknown; setItem?: unknown } | null;
  if (!v) return null;
  if (typeof v.getItem !== 'function') return null;
  if (typeof v.setItem !== 'function') return null;
  return { getItem: v.getItem.bind(v), setItem: v.setItem.bind(v) };
}

export function getPricingUiMode(): PricingUiMode {
  const ls = getLocalStorage();
  if (!ls) return 'simple';
  const raw = ls.getItem(KEY);
  if (!raw) return 'simple';
  try {
    const v = JSON.parse(raw) as unknown;
    const m = (v as { pricingMode?: unknown } | null)?.pricingMode;
    return m === 'expert' ? 'expert' : 'simple';
  } catch {
    return 'simple';
  }
}

export function setPricingUiMode(mode: PricingUiMode): void {
  const ls = getLocalStorage();
  if (!ls) return;
  ls.setItem(KEY, JSON.stringify({ pricingMode: mode }));
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run:

```bash
npm run test:run -- src/lib/settings/uiStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/uiStorage.ts src/lib/settings/uiStorage.test.ts
git commit -m "feat(settings): persist advanced pricing UI mode"
```

---

### Task 3: Implement the new Advanced pricing UI (Simple default + Expert disclosure)

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Add UI mode state**

In `src/app/settings/page.tsx`:

- import `getPricingUiMode`, `setPricingUiMode`
- add state `pricingUiMode` initialized from `getPricingUiMode()`
- provide a small toggle button group: “Simple” / “Expert”
- persist changes via `setPricingUiMode(next)`

- [ ] **Step 2: Replace the current Advanced section content**

Replace the Advanced block (currently showing multiplier, rounding, NM/LP/MP, sell preset) with:

- Pricing style cards:
  - Margin / Balance / Volume
  - Clicking a card sets slider `t` to 0 / 0.5 / 1 and updates `draft.advanced` using `mapSimpleToAdvanced`
- Profit ↔ Volume slider:
  - range input from 0..100 (integer), derived `t = value / 100`
  - onChange sets `draft.advanced = mapSimpleToAdvanced({ preset: 'balance', t })`
- “What this means” summary:
  - Buy: show “~{(buylistMultiplier*100).toFixed(0)}% of benchmark”
  - Buy rounding label from `buyRoundingLabel`
  - Sell by condition: show three lines:
    - Near mint: 0%
    - Light play: {lp*100}%
    - Moderate play: {mp*100}%
  - Sell rounding label from `sellRoundingLabel`

Simple mode shows only the above plus “Show expert settings”.

- [ ] **Step 3: Implement Expert disclosure**

When in Expert mode (or when disclosure is opened), show the expert controls:

- “How much you pay (vs benchmark)” number input and slider (same behavior as current buylist multiplier)
- “Round buy suggestions” (0.50 / 1.00)
- “Adjust sell by condition” with labels “Near mint / Light play / Moderate play”
- “Round sell prices” with labels:
  - “Keep decimals”
  - “Round to $0.50”
  - “Round to $1.00”

All expert controls directly update `draft.advanced.*` exactly like today, just with new labels and expanded acronyms.

- [ ] **Step 4: Ensure existing Save/Revert/Reset continue working**

- “Save settings” still calls `setStoredSettings(draft)`
- “Revert” still reloads `getStoredSettings()`
- “Reset” still sets `DEFAULT_SETTINGS`

- [ ] **Step 5: Manual verification in dev server**

Run:

```bash
npm run dev
```

Verify in browser:

- Settings → Advanced shows Simple mode by default
- Slider changes update summary and persist after Save
- Switching to Expert updates `draft.advanced` and Save persists
- Refresh Settings page retains last selected mode (Simple/Expert)

- [ ] **Step 6: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(settings): make advanced pricing user-friendly"
```

---

### Task 4: Regression test pass (existing suite)

**Files:**
- Test: existing

- [ ] **Step 1: Run full unit test suite**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 2: Commit (if any follow-up fixes)**

```bash
git add -A
git commit -m "test: ensure settings pricing changes are covered"
```

---

## Plan Self-Review

- Spec coverage: Simple presets + slider, expert disclosure, acronym removal, UI-mode persistence.
- Placeholder scan: no TODO/TBD; all file paths and concrete steps included.
- Type consistency: uses `AdvancedPricingSettings`, existing sell presets, existing settings storage.

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-05-30-settings-advanced-pricing-friendly-implementation-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints

Which approach?

