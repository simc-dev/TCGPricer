# Inventory Top KPIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show “quick numbers” at the top of the Inventory list page: Unique items, Total quantity, and Estimated SGD value.

**Architecture:** Add a pure KPI computation helper in `src/lib/inventory/` (unit-tested), then render a compact pill row in the Inventory page using design-system tokens.

**Tech Stack:** Next.js app router, React, Tailwind v4 tokens (`bg-surface`, `ring-border`, etc.), Vitest.

---

## File Structure / Responsibilities
- Create: [kpis.ts](file:///c:/dev/Project-Trae/src/lib/inventory/kpis.ts)
  - Exports `computeInventoryKpis(state)` that returns `{ uniqueCount, totalQuantity, estimatedValueSgd }`.
  - No browser APIs; deterministic; easy to unit test.
- Create: [kpis.test.ts](file:///c:/dev/Project-Trae/src/lib/inventory/kpis.test.ts)
  - Unit tests for all KPI calculations and edge cases.
- Modify: [inventory/page.tsx](file:///c:/dev/Project-Trae/src/app/inventory/page.tsx)
  - Uses `computeInventoryKpis()` to render the top KPI pills.

---

### Task 1: Add KPI computation helper (TDD)

**Files:**
- Create: `c:/dev/Project-Trae/src/lib/inventory/kpis.ts`
- Test: `c:/dev/Project-Trae/src/lib/inventory/kpis.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/inventory/kpis.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { InventoryState } from './types'
import { computeInventoryKpis } from './kpis'

describe('computeInventoryKpis', () => {
  it('returns zeros for empty inventory', () => {
    const s: InventoryState = { items: {} }
    expect(computeInventoryKpis(s)).toEqual({ uniqueCount: 0, totalQuantity: 0, estimatedValueSgd: 0 })
  })

  it('computes unique + total quantity', () => {
    const s: InventoryState = {
      items: {
        a: { key: 'a', cardCode: 'A', variant: null, cardName: 'A', rarity: null, quantityTotal: 2, lastSeenAtIso: '2026-01-01T00:00:00.000Z', events: [] },
        b: { key: 'b', cardCode: 'B', variant: null, cardName: 'B', rarity: null, quantityTotal: 3, lastSeenAtIso: '2026-01-01T00:00:00.000Z', events: [] }
      }
    }
    expect(computeInventoryKpis(s).uniqueCount).toBe(2)
    expect(computeInventoryKpis(s).totalQuantity).toBe(5)
  })

  it('uses the most recent non-null suggestedSgd per item to estimate value', () => {
    const s: InventoryState = {
      items: {
        a: {
          key: 'a',
          cardCode: 'A',
          variant: null,
          cardName: 'A',
          rarity: null,
          quantityTotal: 2,
          lastSeenAtIso: '2026-01-01T00:00:00.000Z',
          events: [
            { occurredAtIso: '2026-01-01T00:00:02.000Z', delta: 1, reason: 'saved', suggestedSgd: 10, benchmarkSource: 'carousell' },
            { occurredAtIso: '2026-01-01T00:00:01.000Z', delta: 1, reason: 'saved', suggestedSgd: 9, benchmarkSource: 'mercari' }
          ]
        },
        b: {
          key: 'b',
          cardCode: 'B',
          variant: null,
          cardName: 'B',
          rarity: null,
          quantityTotal: 3,
          lastSeenAtIso: '2026-01-01T00:00:00.000Z',
          events: [{ occurredAtIso: '2026-01-01T00:00:01.000Z', delta: 1, reason: 'saved', suggestedSgd: null, benchmarkSource: null }]
        }
      }
    }

    expect(computeInventoryKpis(s).estimatedValueSgd).toBe(20)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

Run:

```bash
npm run test:run -- src/lib/inventory/kpis.test.ts
```

Expected: FAIL with “Cannot find module './kpis'” or missing export.

- [ ] **Step 3: Implement `computeInventoryKpis`**

Create `src/lib/inventory/kpis.ts`:

```ts
import type { InventoryState } from './types'

export type InventoryKpis = {
  uniqueCount: number
  totalQuantity: number
  estimatedValueSgd: number
}

export function computeInventoryKpis(state: InventoryState): InventoryKpis {
  const items = Object.values(state.items ?? {})
  const uniqueCount = items.length
  let totalQuantity = 0
  let estimatedValueSgd = 0

  for (const it of items) {
    totalQuantity += it.quantityTotal ?? 0
    const latest = it.events?.find((e) => typeof e.suggestedSgd === 'number' && Number.isFinite(e.suggestedSgd))?.suggestedSgd
    if (typeof latest === 'number') {
      estimatedValueSgd += (it.quantityTotal ?? 0) * latest
    }
  }

  return {
    uniqueCount,
    totalQuantity,
    estimatedValueSgd: Math.round(estimatedValueSgd)
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run:

```bash
npm run test:run -- src/lib/inventory/kpis.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory/kpis.ts src/lib/inventory/kpis.test.ts
git commit -m "feat(inventory): add KPI computation helper"
```

---

### Task 2: Render KPI pills on Inventory page

**Files:**
- Modify: `c:/dev/Project-Trae/src/app/inventory/page.tsx`

- [ ] **Step 1: Add KPI formatting helpers**

In `src/app/inventory/page.tsx`, add these functions (near `formatUpdatedTime`):

```ts
function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function formatSgd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
    currencyDisplay: 'narrowSymbol'
  }).format(n)
}
```

- [ ] **Step 2: Compute KPIs from stored inventory**

Add import:

```ts
import { computeInventoryKpis } from "@/lib/inventory/kpis";
```

Add memoized KPIs in the component:

```ts
  const kpis = useMemo(() => computeInventoryKpis(state), [state]);
```

- [ ] **Step 3: Render the compact pill row**

Insert this block inside the `<div className="mx-auto ...">` container, above the Search card:

```tsx
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-surface px-3 py-2 ring-1 ring-border">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Unique</div>
            <div className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatInt(kpis.uniqueCount)}</div>
          </div>
          <div className="rounded-full bg-surface px-3 py-2 ring-1 ring-border">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total qty</div>
            <div className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatInt(kpis.totalQuantity)}</div>
          </div>
          <div className="rounded-full bg-surface px-3 py-2 ring-1 ring-border">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Est. value</div>
            <div className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatSgd(kpis.estimatedValueSgd)}</div>
          </div>
        </div>
```

Note: This should appear whether inventory is empty or not (it reads from `state.items` and safely falls back to zeros).

- [ ] **Step 4: Run unit tests**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 5: Manual check in dev server**

Run:

```bash
npm run dev
```

Verify:
- `/inventory` shows the 3 pills at the top.
- “Add demo cards” causes totals to update immediately.
- Switching tabs/pages and coming back keeps values consistent.

- [ ] **Step 6: Commit**

```bash
git add src/app/inventory/page.tsx
git commit -m "feat(inventory): show top KPI pills"
```

---

## Plan Self-Review
- Spec coverage: Unique / Total qty / Est. value are implemented; empty + partially valued states covered by computation defaults.
- Placeholder scan: No TODO/TBD; every step includes concrete code/commands.
- Type consistency: Uses existing `InventoryState`, `InventoryItem`, and `InventoryEvent.suggestedSgd`.

