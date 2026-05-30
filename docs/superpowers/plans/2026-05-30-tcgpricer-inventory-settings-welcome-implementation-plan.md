# CardScout Inventory + Settings + Welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bottom-tab navigation, a 4-screen welcome/onboarding flow, a Settings page (source toggles + advanced pricing knobs), and an Inventory feature that auto-tracks saved scans (+/- adjustments) with optional Google Sheets logging.

**Architecture:** Client-side Settings + Inventory are stored locally (localStorage). Pricing API receives Settings to determine which sources to fetch and what pricing knobs to apply. On successful “Save to Sheet”, the app increments inventory locally and appends an Inventory Log row (tab override) when Sheets is configured.

**Tech Stack:** Next.js App Router (client components where needed), TypeScript, Tailwind, Vitest.

---

## File Structure (Planned)

**Create**
- `src/lib/settings/types.ts`
- `src/lib/settings/storage.ts`
- `src/lib/settings/storage.test.ts`
- `src/lib/inventory/types.ts`
- `src/lib/inventory/store.ts`
- `src/lib/inventory/store.test.ts`
- `src/lib/google/inventoryRow.ts`
- `src/lib/google/inventoryRow.test.ts`
- `src/components/AppBottomTabs.tsx`
- `src/components/AppShell.tsx`
- `src/components/OnboardingOverlay.tsx`
- `src/app/settings/page.tsx`
- `src/app/inventory/page.tsx`
- `src/app/inventory/[key]/page.tsx`

**Modify**
- `src/app/layout.tsx`
- `src/app/api/pricing/quote/route.ts`
- `src/lib/pricing/math.ts`
- `src/lib/pricing/math.test.ts`
- `src/app/api/sheets/append/route.ts`
- `src/lib/google/sheets.ts`
- `src/app/scan/page.tsx`
- `src/app/batch/page.tsx`

---

## Task 1: Settings model (types + local persistence)

**Files:**
- Create: `src/lib/settings/types.ts`
- Create: `src/lib/settings/storage.ts`
- Test: `src/lib/settings/storage.test.ts`

### Step 1: Create Settings types + defaults

Create `src/lib/settings/types.ts`:

```ts
import type { Condition, PriceSource } from '@/lib/types'

export type SellRoundingPreset = 'off' | 'conservative' | 'retail'

export type PricingSourceToggles = Record<PriceSource, boolean>

export type AdvancedPricingSettings = {
  buylistMultiplier: number
  buyRounding: 0.5 | 1
  conditionDiscounts: Record<Condition, number>
  sellRoundingPreset: SellRoundingPreset
}

export type AppSettings = {
  sources: PricingSourceToggles
  advanced: AdvancedPricingSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  sources: {
    carousell: true,
    mercari: true,
    pricecharting: true,
    yuyutei: true
  },
  advanced: {
    buylistMultiplier: 0.7,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.1, mp: 0.2 },
    sellRoundingPreset: 'retail'
  }
}
```

### Step 2: Add settings storage helpers with validation

Create `src/lib/settings/storage.ts`:

```ts
import type { AppSettings, SellRoundingPreset } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEY = 'cardscout:settings:v1'

function isSellPreset(v: unknown): v is SellRoundingPreset {
  return v === 'off' || v === 'conservative' || v === 'retail'
}

export function loadSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as any
    const src = parsed?.sources ?? {}
    const adv = parsed?.advanced ?? {}
    return {
      sources: {
        carousell: src.carousell !== false,
        mercari: src.mercari !== false,
        pricecharting: src.pricecharting !== false,
        yuyutei: src.yuyutei !== false
      },
      advanced: {
        buylistMultiplier: typeof adv.buylistMultiplier === 'number' ? adv.buylistMultiplier : DEFAULT_SETTINGS.advanced.buylistMultiplier,
        buyRounding: adv.buyRounding === 1 ? 1 : 0.5,
        conditionDiscounts: {
          nm: typeof adv?.conditionDiscounts?.nm === 'number' ? adv.conditionDiscounts.nm : DEFAULT_SETTINGS.advanced.conditionDiscounts.nm,
          lp: typeof adv?.conditionDiscounts?.lp === 'number' ? adv.conditionDiscounts.lp : DEFAULT_SETTINGS.advanced.conditionDiscounts.lp,
          mp: typeof adv?.conditionDiscounts?.mp === 'number' ? adv.conditionDiscounts.mp : DEFAULT_SETTINGS.advanced.conditionDiscounts.mp
        },
        sellRoundingPreset: isSellPreset(adv.sellRoundingPreset) ? adv.sellRoundingPreset : DEFAULT_SETTINGS.advanced.sellRoundingPreset
      }
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  return loadSettings(window.localStorage.getItem(KEY))
}

export function setStoredSettings(next: AppSettings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(next))
}
```

### Step 3: Add unit tests for settings validation

Create `src/lib/settings/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from './types'
import { loadSettings } from './storage'

describe('loadSettings', () => {
  it('returns defaults for null', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial settings', () => {
    const v = loadSettings(JSON.stringify({ sources: { mercari: false }, advanced: { buyRounding: 1 } }))
    expect(v.sources.mercari).toBe(false)
    expect(v.sources.carousell).toBe(true)
    expect(v.advanced.buyRounding).toBe(1)
  })

  it('guards invalid values', () => {
    const v = loadSettings(JSON.stringify({ advanced: { buyRounding: 123, sellRoundingPreset: 'lol' } }))
    expect(v.advanced.buyRounding).toBe(0.5)
    expect(v.advanced.sellRoundingPreset).toBe(DEFAULT_SETTINGS.advanced.sellRoundingPreset)
  })
})
```

### Step 4: Run tests

Run:

```powershell
npm run test:run
```

Expected: PASS.

---

## Task 2: Pricing math supports Advanced settings

**Files:**
- Modify: `src/lib/pricing/math.ts`
- Test: `src/lib/pricing/math.test.ts`

### Step 1: Update sell pricing to accept discounts + rounding preset

Update `src/lib/pricing/math.ts`:

```ts
import type { Condition } from '../types'

export function roundToIncrement(value: number, inc: 0.5 | 1): number {
  const units = Math.round(value / inc)
  return Number((units * inc).toFixed(2))
}

export function computeBuyPrice(input: {
  baseSgd: number
  buylistMultiplier: number
  rounding: 0.5 | 1
}): number {
  return roundToIncrement(input.baseSgd * input.buylistMultiplier, input.rounding)
}

export type SellRoundingPreset = 'off' | 'conservative' | 'retail'

function psychRound(value: number, preset: SellRoundingPreset): number {
  if (preset === 'off') return value
  if (preset === 'conservative') return roundToIncrement(value, 0.5)
  return roundToIncrement(value, 1)
}

export function computeSellPrice(input: {
  baseSgd: number
  condition: Condition
  conditionDiscounts?: Record<Condition, number>
  roundingPreset?: SellRoundingPreset
}): number {
  const discounts = input.conditionDiscounts ?? { nm: 0, lp: 0.1, mp: 0.2 }
  const discount = typeof discounts[input.condition] === 'number' ? discounts[input.condition] : 0
  const discounted = input.baseSgd * (1 - discount)
  const rounded = psychRound(discounted, input.roundingPreset ?? 'retail')
  return Number(rounded.toFixed(2))
}
```

### Step 2: Update tests for new behavior

Update `src/lib/pricing/math.test.ts` (append these cases):

```ts
import { describe, expect, it } from 'vitest'

import { computeSellPrice } from './math'

describe('computeSellPrice rounding presets', () => {
  it('retail rounds to nearest 1', () => {
    expect(computeSellPrice({ baseSgd: 10.4, condition: 'nm', roundingPreset: 'retail' })).toBe(10)
    expect(computeSellPrice({ baseSgd: 10.6, condition: 'nm', roundingPreset: 'retail' })).toBe(11)
  })

  it('conservative rounds to nearest 0.5', () => {
    expect(computeSellPrice({ baseSgd: 10.24, condition: 'nm', roundingPreset: 'conservative' })).toBe(10)
    expect(computeSellPrice({ baseSgd: 10.26, condition: 'nm', roundingPreset: 'conservative' })).toBe(10.5)
  })

  it('applies custom condition discounts', () => {
    const v = computeSellPrice({
      baseSgd: 100,
      condition: 'lp',
      conditionDiscounts: { nm: 0, lp: 0.2, mp: 0.3 },
      roundingPreset: 'off'
    })
    expect(v).toBe(80)
  })
})
```

### Step 3: Run tests

Run:

```powershell
npm run test:run
```

Expected: PASS.

---

## Task 3: Pricing API accepts Settings + skips disabled sources

**Files:**
- Modify: `src/app/api/pricing/quote/route.ts`

### Step 1: Extend request schema

Modify the `QuoteRequest` type and parser to accept:
- `enabledSources: Record<PriceSource, boolean>`
- `advanced: { buylistMultiplier, buyRounding, conditionDiscounts, sellRoundingPreset }`

### Step 2: Conditionally run source fetchers

Update the `Promise.all` block to only call fetchers for enabled sources. For disabled sources, use `Promise.resolve(null)` so the tuple stays consistent.

### Step 3: Use advanced inputs for computeBuyPrice/computeSellPrice

- `computeBuyPrice` uses `advanced.buylistMultiplier` and `advanced.buyRounding`
- `computeSellPrice` uses `advanced.conditionDiscounts` and `advanced.sellRoundingPreset`

### Step 4: Run build + tests

Run:

```powershell
npm run test:run
npm run build
```

Expected: PASS.

---

## Task 4: Extend Sheets append endpoint to support tab override

**Files:**
- Modify: `src/app/api/sheets/append/route.ts`
- Modify: `src/lib/google/sheets.ts`

### Step 1: Add optional tabName to append request

Update `AppendRequest` to:

```ts
type AppendRequest = {
  values: Array<string | number | null>
  tabName?: string
}
```

Validate `tabName` as a non-empty string when present.

### Step 2: Add tabName option to appendRow

Modify `AppendRowOptions` in `src/lib/google/sheets.ts` to include:

```ts
tabName?: string
```

Then:
- Mock: record `tabName: options?.tabName ?? process.env.GOOGLE_SHEETS_TAB_NAME ?? null`
- Live: use `range = `${tabName}!A1`` where `tabName = options?.tabName ?? env.googleSheetsTabName`

### Step 3: Wire API route to pass tabName

In `src/app/api/sheets/append/route.ts`, call:

```ts
appendRow(body.values, body.tabName ? { tabName: body.tabName } : undefined)
```

### Step 4: Run tests + build

Run:

```powershell
npm run test:run
npm run build
```

Expected: PASS.

---

## Task 5: Inventory store (local) + tests

**Files:**
- Create: `src/lib/inventory/types.ts`
- Create: `src/lib/inventory/store.ts`
- Test: `src/lib/inventory/store.test.ts`

### Step 1: Create inventory types

Create `src/lib/inventory/types.ts`:

```ts
import type { CardIdentity, PricingMode } from '@/lib/types'

export type InventoryKey = string

export type InventoryEvent = {
  occurredAtIso: string
  delta: number
  reason: 'saved' | 'adjust'
  mode?: PricingMode
  condition?: 'nm' | 'lp' | 'mp' | null
  suggestedSgd?: number | null
  benchmarkSource?: string | null
}

export type InventoryItem = {
  key: InventoryKey
  cardCode: string
  variant: string | null
  cardName: string
  rarity: string | null
  quantityTotal: number
  lastSeenAtIso: string
  events: InventoryEvent[]
}

export type InventoryState = {
  items: Record<InventoryKey, InventoryItem>
}
```

### Step 2: Implement store (keying = cardCode + variant)

Create `src/lib/inventory/store.ts`:

```ts
import type { CardIdentity, Condition, PricingDecision, PricingMode } from '@/lib/types'
import type { InventoryEvent, InventoryKey, InventoryState } from './types'

const KEY = 'cardscout:inventory:v1'
const MAX_EVENTS = 50

export function inventoryKeyOf(identity: CardIdentity): InventoryKey {
  const v = identity.variant ?? ''
  return `${identity.cardCode}::${v}`
}

export function loadInventory(raw: string | null): InventoryState {
  if (!raw) return { items: {} }
  try {
    const parsed = JSON.parse(raw) as any
    if (!parsed?.items || typeof parsed.items !== 'object') return { items: {} }
    return { items: parsed.items as InventoryState['items'] }
  } catch {
    return { items: {} }
  }
}

export function getStoredInventory(): InventoryState {
  if (typeof window === 'undefined') return { items: {} }
  return loadInventory(window.localStorage.getItem(KEY))
}

export function setStoredInventory(next: InventoryState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(next))
}

export function applyInventoryDelta(input: {
  state: InventoryState
  identity: CardIdentity
  delta: number
  reason: InventoryEvent['reason']
  occurredAtIso: string
  mode?: PricingMode
  condition?: Condition | null
  suggestedSgd?: number | null
  decision?: PricingDecision | null
}): InventoryState {
  const key = inventoryKeyOf(input.identity)
  const prev = input.state.items[key]
  const nextQty = Math.max(0, (prev?.quantityTotal ?? 0) + input.delta)
  const event: InventoryEvent = {
    occurredAtIso: input.occurredAtIso,
    delta: input.delta,
    reason: input.reason,
    mode: input.mode,
    condition: input.condition ?? null,
    suggestedSgd: input.suggestedSgd ?? null,
    benchmarkSource: input.decision?.benchmarkSource ?? null
  }
  const nextEvents = [event, ...(prev?.events ?? [])].slice(0, MAX_EVENTS)
  return {
    items: {
      ...input.state.items,
      [key]: {
        key,
        cardCode: input.identity.cardCode,
        variant: input.identity.variant ?? null,
        cardName: input.identity.cardName,
        rarity: input.identity.rarity,
        quantityTotal: nextQty,
        lastSeenAtIso: input.occurredAtIso,
        events: nextEvents
      }
    }
  }
}
```

### Step 3: Add tests (keying + non-negative + event cap)

Create `src/lib/inventory/store.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { CardIdentity } from '@/lib/types'
import { applyInventoryDelta, inventoryKeyOf } from './store'

const baseIdentity: CardIdentity = {
  cardCode: 'OP01-016',
  cardName: 'Nami',
  setCode: null,
  rarity: null,
  variant: 'standard',
  language: 'unknown',
  confidence: 1,
  ambiguity: false
}

describe('inventoryKeyOf', () => {
  it('keys by code + variant', () => {
    expect(inventoryKeyOf(baseIdentity)).toBe('OP01-016::standard')
  })
})

describe('applyInventoryDelta', () => {
  it('increments and never goes below 0', () => {
    const s1 = applyInventoryDelta({
      state: { items: {} },
      identity: baseIdentity,
      delta: 1,
      reason: 'saved',
      occurredAtIso: '2026-01-01T00:00:00.000Z'
    })
    expect(s1.items['OP01-016::standard'].quantityTotal).toBe(1)

    const s2 = applyInventoryDelta({
      state: s1,
      identity: baseIdentity,
      delta: -5,
      reason: 'adjust',
      occurredAtIso: '2026-01-01T00:00:01.000Z'
    })
    expect(s2.items['OP01-016::standard'].quantityTotal).toBe(0)
  })
})
```

### Step 4: Run tests

Run:

```powershell
npm run test:run
```

Expected: PASS.

---

## Task 6: Inventory Log row builder for Sheets

**Files:**
- Create: `src/lib/google/inventoryRow.ts`
- Test: `src/lib/google/inventoryRow.test.ts`

### Step 1: Create row builder

Create `src/lib/google/inventoryRow.ts`:

```ts
import type { CardIdentity, Condition, PricingDecision, PricingMode } from '@/lib/types'

export function buildInventoryLogRowValues(input: {
  timestampIso: string
  identity: CardIdentity
  delta: number
  reason: 'saved' | 'adjust'
  mode?: PricingMode
  condition?: Condition | null
  suggestedSgd?: number | null
  decision?: PricingDecision | null
}): Array<string | number | null> {
  return [
    input.timestampIso,
    input.identity.cardCode || null,
    input.identity.cardName || null,
    input.identity.variant ?? null,
    input.delta,
    input.reason,
    input.mode ?? null,
    input.condition ?? null,
    input.suggestedSgd ?? null,
    input.decision?.benchmarkSource ?? null
  ]
}
```

### Step 2: Add tests

Create `src/lib/google/inventoryRow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { CardIdentity } from '@/lib/types'
import { buildInventoryLogRowValues } from './inventoryRow'

describe('buildInventoryLogRowValues', () => {
  it('builds a stable row', () => {
    const id: CardIdentity = {
      cardCode: 'OP01-016',
      cardName: 'Nami',
      setCode: null,
      rarity: null,
      variant: 'standard',
      language: 'unknown',
      confidence: 1,
      ambiguity: false
    }
    expect(
      buildInventoryLogRowValues({
        timestampIso: '2026-01-01T00:00:00.000Z',
        identity: id,
        delta: 1,
        reason: 'saved'
      })
    ).toEqual(['2026-01-01T00:00:00.000Z', 'OP01-016', 'Nami', 'standard', 1, 'saved', null, null, null, null])
  })
})
```

### Step 3: Run tests

Run:

```powershell
npm run test:run
```

Expected: PASS.

---

## Task 7: UI shell (bottom tabs) + onboarding overlay

**Files:**
- Create: `src/components/AppBottomTabs.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/OnboardingOverlay.tsx`
- Modify: `src/app/layout.tsx`

### Step 1: Add Bottom Tabs component

Create `src/components/AppBottomTabs.tsx` that renders 4 tabs and highlights active route using `usePathname()`.

### Step 2: Add AppShell component

Create `src/components/AppShell.tsx` as a client component wrapping:
- optional top title slot (lightweight)
- main content
- bottom tabs

### Step 3: Add Onboarding overlay (4 screens, shown once)

Create `src/components/OnboardingOverlay.tsx`:
- localStorage key `cardscout:onboarding:v1`
- 4 screens with dots + swipe + Next
- Skip button
- When completed/skip: set key and hide overlay

### Step 4: Mount OnboardingOverlay globally

Modify `src/app/layout.tsx` to wrap `children` with a client AppShell host that can render the overlay. Keep API routes unaffected.

### Step 5: Verify manually

Run:

```powershell
npm run dev
```

Expected:
- First load shows onboarding.
- Skip/finish hides it and it stays hidden on refresh.

---

## Task 8: Settings page UI (toggles + advanced)

**Files:**
- Create: `src/app/settings/page.tsx`
- Modify: `src/app/scan/page.tsx`
- Modify: `src/app/batch/page.tsx`

### Step 1: Build Settings screen

`/settings`:
- Source toggles with clear descriptions
- Advanced controls:
  - buylistMultiplier (slider or stepper)
  - buyRounding (segmented control 0.5 / 1)
  - conditionDiscounts (3 inputs)
  - sellRoundingPreset (segmented: Off / Conservative / Retail)

Persist via `setStoredSettings()` and load via `getStoredSettings()`.

### Step 2: Pass settings into quote requests

Update `fetchQuote()` in both Scan + Batch pages to send:
- enabledSources derived from Settings
- advanced inputs derived from Settings

Expected: toggling a source off prevents it from appearing in `quote.observations` and may change benchmark.

### Step 3: Run tests + build

Run:

```powershell
npm run test:run
npm run build
```

Expected: PASS.

---

## Task 9: Inventory pages (recent-first + item detail +/-)

**Files:**
- Create: `src/app/inventory/page.tsx`
- Create: `src/app/inventory/[key]/page.tsx`

### Step 1: Inventory list page

`/inventory`:
- search input
- recent-first list of items from local inventory store
- row shows name, code, variant, quantity (×N)
- tap navigates to `/inventory/[key]`

### Step 2: Inventory detail page

`/inventory/[key]`:
- show identity summary and quantity
- +/- buttons:
  - applyInventoryDelta with reason `adjust`
  - persist updated state
- show last N events

---

## Task 10: Wire inventory updates into Save flow (+ inventory log append)

**Files:**
- Modify: `src/app/scan/page.tsx`
- Modify: `src/app/batch/page.tsx`

### Step 1: After successful pricing save, increment inventory locally

In both save flows:
- Only after pricing append success:
  - applyInventoryDelta with delta +1, reason `saved`
  - persist to localStorage

### Step 2: Append Inventory Log row to Sheets (tab override)

After local increment, call `/api/sheets/append` with:
- `tabName: "Inventory Log"`
- `values: buildInventoryLogRowValues(...)`

Error handling:
- Pricing save failure: no inventory increment.
- Inventory log append failure: keep local increment and show a non-blocking message.

---

## Task 11: Final verification

Run:

```powershell
npm run test:run
npm run build
```

Manual smoke checks:
- Onboarding shows once per device.
- Settings toggles change observations/benchmark.
- Inventory increments only after save succeeds.
- Inventory detail +/- works and does not go below 0.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-05-30-tcgpricer-inventory-settings-welcome-implementation-plan.md`.

Two execution options:
1) **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2) **Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
