# Dashboard + Upload Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Dashboard (`/`) the landing screen and merge Scan + Batch into a single Upload screen (`/upload`) with legacy redirects from `/scan` and `/batch`.

**Architecture:** Keep the current Scan and Batch flows intact by reusing their existing components/logic, while introducing a new Upload route that toggles between them via `?mode=`. Add a new Dashboard route that summarizes local inventory and recent saves.

**Tech Stack:** Next.js App Router (Next 16), React 19, Tailwind CSS, Vitest.

---

## File Structure (Creates / Modifies)

**Create**
- `src/app/upload/page.tsx` (Upload entry route, server component)
- `src/lib/upload/mode.ts` (query parsing, shared constants)
- `src/lib/upload/mode.test.ts` (unit tests)
- `src/lib/dashboard/activity.ts` (derive recent activity + attention counts)
- `src/lib/dashboard/activity.test.ts` (unit tests)

**Modify**
- `next.config.ts` (redirect `/scan` and `/batch` to `/upload?mode=...`)
- `src/app/page.tsx` (replace placeholder home with Dashboard)
- `src/components/AppTopNav.tsx` (mode switch targets `/upload?mode=` and labels “Single/Batch”)
- `src/components/AppBottomTabs.tsx` (tabs: Dashboard/Upload/Inventory/Settings)
- `src/app/inventory/page.tsx` (empty state links to Upload)
- `src/components/OnboardingOverlay.tsx` (route to Upload instead of Scan)

---

## Task 1: Add legacy redirects for /scan and /batch

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Implement redirects in Next config**

Replace file contents with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/scan", destination: "/upload?mode=single", permanent: false },
      { source: "/batch", destination: "/upload?mode=batch", permanent: false },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify redirect behavior manually**

Run: `npm run dev`

Expected:
- Opening `http://localhost:3000/scan` navigates to `/upload?mode=single`
- Opening `http://localhost:3000/batch` navigates to `/upload?mode=batch`

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: redirect scan and batch to upload"
```

---

## Task 2: Add Upload mode parsing (shared helper)

**Files:**
- Create: `src/lib/upload/mode.ts`
- Test: `src/lib/upload/mode.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";

import { parseUploadMode } from "./mode";

describe("parseUploadMode", () => {
  it("defaults to single when value is missing", () => {
    expect(parseUploadMode(null)).toBe("single");
  });

  it("accepts single and batch", () => {
    expect(parseUploadMode("single")).toBe("single");
    expect(parseUploadMode("batch")).toBe("batch");
  });

  it("falls back to single for unknown values", () => {
    expect(parseUploadMode("wat")).toBe("single");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/upload/mode.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper**

```ts
export type UploadMode = "single" | "batch";

export function parseUploadMode(value: string | null): UploadMode {
  if (value === "batch") return "batch";
  return "single";
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:run -- src/lib/upload/mode.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/upload/mode.ts src/lib/upload/mode.test.ts
git commit -m "feat: add upload mode parsing helper"
```

---

## Task 3: Implement the /upload route (reuse existing Scan/Batch flows)

**Files:**
- Create: `src/app/upload/page.tsx`
- Modify: `src/components/AppTopNav.tsx` (switch modes within `/upload`)
- Modify: `src/app/scan/page.tsx` (use updated AppTopNav props)
- Modify: `src/app/batch/page.tsx` (use updated AppTopNav props)

This approach avoids duplicating the Scan/Batch logic. Upload becomes a thin router:
- `/upload?mode=single` renders the existing Scan page content
- `/upload?mode=batch` renders the existing Batch page content

- [ ] **Step 1: Update AppTopNav to switch Upload modes**

Update `src/components/AppTopNav.tsx`:
- Change the prop type to `active: "single" | "batch"`
- Update button labels to “Single” and “Batch”
- Update hrefs to `/upload?mode=single` and `/upload?mode=batch`

Replace file contents with:

```tsx
"use client";

import Link from "next/link";

export function AppTopNav(props: { active: "single" | "batch"; subtitle?: string }) {
  return (
    <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">CardScout</div>
            {props.subtitle ? <div className="truncate text-xs text-muted">{props.subtitle}</div> : null}
          </Link>
          <div className="rounded-full bg-surface2 p-1 text-sm font-semibold text-foreground ring-1 ring-border shadow-sm">
            <div className="grid grid-cols-2">
              <Link
                href="/upload?mode=single"
                className={[
                  "h-9 rounded-full px-3 grid place-items-center transition",
                  props.active === "single"
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted hover:bg-surface/70 hover:text-foreground",
                ].join(" ")}
              >
                Single
              </Link>
              <Link
                href="/upload?mode=batch"
                className={[
                  "h-9 rounded-full px-3 grid place-items-center transition",
                  props.active === "batch"
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted hover:bg-surface/70 hover:text-foreground",
                ].join(" ")}
              >
                Batch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update Scan and Batch pages to use the new AppTopNav active values**

In `src/app/scan/page.tsx`, change:

```tsx
<AppTopNav active="scan" subtitle="Scan-to-Sheet" />
```

to:

```tsx
<AppTopNav active="single" subtitle="Upload" />
```

In `src/app/batch/page.tsx`, change:

```tsx
<AppTopNav active="batch" subtitle="Multi-scan intake" />
```

to:

```tsx
<AppTopNav active="batch" subtitle="Upload" />
```

- [ ] **Step 3: Create the /upload server page that selects which flow to render**

```tsx
import { parseUploadMode, type UploadMode } from "@/lib/upload/mode";

export default async function UploadPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await props.searchParams) ?? {};
  const raw = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode ?? null;
  const mode: UploadMode = parseUploadMode(raw);

  const ScanPage = (await import("@/app/scan/page")).default;
  const BatchPage = (await import("@/app/batch/page")).default;
  return mode === "batch" ? <BatchPage /> : <ScanPage />;
}
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Expected:
- `/upload?mode=single` shows single intake flow
- `/upload?mode=batch` shows batch queue flow
- The Single/Batch switch in the header swaps between modes while staying on `/upload`

- [ ] **Step 5: Commit**

```bash
git add src/components/AppTopNav.tsx src/app/upload/page.tsx src/app/scan/page.tsx src/app/batch/page.tsx
git commit -m "feat: add upload route reusing scan and batch flows"
```

---

## Task 4: Implement Dashboard as the landing route (/)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/lib/dashboard/activity.ts`
- Test: `src/lib/dashboard/activity.test.ts`

- [ ] **Step 1: Write failing unit tests for activity derivation**

```ts
import { describe, expect, it } from "vitest";

import { computeAttentionCounts, type SavedEntryLike } from "./activity";

describe("computeAttentionCounts", () => {
  it("counts high value, low confidence, ambiguity, and errors", () => {
    const now = "2026-05-30T10:00:00.000Z";
    const entries: SavedEntryLike[] = [
      { status: "saved", lastSavedAtIso: now, suggestedSgd: 150, identity: { confidence: 0.95, ambiguity: false } },
      { status: "saved", lastSavedAtIso: now, suggestedSgd: 20, identity: { confidence: 0.7, ambiguity: false } },
      { status: "saved", lastSavedAtIso: now, suggestedSgd: 20, identity: { confidence: 0.95, ambiguity: true } },
      { status: "error", lastSavedAtIso: now, suggestedSgd: null, identity: { confidence: 0.95, ambiguity: false } },
    ];

    expect(computeAttentionCounts(entries)).toEqual({
      highValue: 1,
      lowConfidence: 1,
      ambiguity: 1,
      saveErrors: 1,
      total: 4,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/lib/dashboard/activity.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement activity helper**

```ts
export type SavedEntryLike = {
  status: "saving" | "saved" | "error";
  lastSavedAtIso: string;
  suggestedSgd: number | null;
  identity: {
    confidence: number;
    ambiguity: boolean;
  };
};

export function computeAttentionCounts(entries: SavedEntryLike[]) {
  const highValue = entries.filter((e) => typeof e.suggestedSgd === "number" && e.suggestedSgd > 100).length;
  const lowConfidence = entries.filter((e) => typeof e.identity?.confidence === "number" && e.identity.confidence < 0.9).length;
  const ambiguity = entries.filter((e) => e.identity?.ambiguity === true).length;
  const saveErrors = entries.filter((e) => e.status === "error").length;
  const total = highValue + lowConfidence + ambiguity + saveErrors;
  return { highValue, lowConfidence, ambiguity, saveErrors, total };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:run -- src/lib/dashboard/activity.test.ts`

Expected: PASS

- [ ] **Step 5: Replace Home page with Dashboard UI**

Implement Dashboard using existing design-system Tailwind tokens (like Inventory page). This version reads:
- Inventory KPIs (already implemented in `src/lib/inventory/kpis.ts`)
- Batch saved entries list (from localStorage key `batch:savedEntries:v1`)

Replace `src/app/page.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { computeAttentionCounts, type SavedEntryLike } from "@/lib/dashboard/activity";
import { computeInventoryKpis } from "@/lib/inventory/kpis";
import { useStoredInventory } from "@/lib/inventory/useStoredInventory";

type SavedEntry = {
  status: "saving" | "saved" | "error";
  lastSavedAtIso: string;
  suggestedSgd: number | null;
  identity: {
    confidence: number;
    ambiguity: boolean;
    cardName?: string | null;
    cardCode?: string | null;
  };
};

function safeReadSavedEntries(): SavedEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("batch:savedEntries:v1");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => it as Partial<SavedEntry>)
      .filter((it) => typeof it.lastSavedAtIso === "string" && typeof it.status === "string" && !!it.identity)
      .map((it) => ({
        status: it.status === "saving" || it.status === "saved" || it.status === "error" ? it.status : "saved",
        lastSavedAtIso: it.lastSavedAtIso as string,
        suggestedSgd: typeof it.suggestedSgd === "number" || it.suggestedSgd === null ? (it.suggestedSgd as number | null) : null,
        identity: {
          confidence: typeof it.identity?.confidence === "number" ? it.identity.confidence : 0,
          ambiguity: it.identity?.ambiguity === true,
          cardName: typeof it.identity?.cardName === "string" ? it.identity.cardName : null,
          cardCode: typeof it.identity?.cardCode === "string" ? it.identity.cardCode : null,
        },
      }));
  } catch {
    return [];
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function DashboardPage() {
  const inv = useStoredInventory();
  const kpis = useMemo(() => computeInventoryKpis(inv), [inv]);

  const recent = useMemo(() => safeReadSavedEntries().sort((a, b) => b.lastSavedAtIso.localeCompare(a.lastSavedAtIso)).slice(0, 6), []);
  const attention = useMemo(() => computeAttentionCounts(recent as SavedEntryLike[]), [recent]);
  const lastSave = recent[0]?.lastSavedAtIso ?? null;

  return (
    <main className="flex-1">
      <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">Dashboard</div>
            <div className="truncate text-xs text-muted">Inventory and recent activity.</div>
          </div>
          <Link
            href="/upload"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99]"
          >
            Upload
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Items</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">{kpis.uniqueCount}</div>
            <div className="mt-1 text-xs text-muted">Tracked locally</div>
          </div>
          <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Est. value</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              ${kpis.estimatedValueSgd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-muted">Median-based</div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Needs attention</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{attention.total} signals in recent saves</div>
              <div className="mt-1 text-xs text-muted">High value · low confidence · ambiguity · save errors</div>
            </div>
            <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-surface2 px-3 text-sm font-semibold tabular-nums text-foreground ring-1 ring-border">
              {attention.total}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Sync status</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{lastSave ? `Last save: ${formatTime(lastSave)}` : "No saves yet"}</div>
              <div className="mt-1 text-xs text-muted">Derived from recent Upload history</div>
            </div>
            <div className="inline-flex h-9 items-center justify-center rounded-full bg-surface2 px-3 text-xs font-semibold text-muted ring-1 ring-border">
              {recent.some((e) => e.status === "error") ? "Issues" : "Healthy"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Recent activity</div>
          <div className="mt-3 grid gap-3">
            {recent.length === 0 ? (
              <div className="text-sm text-muted">No recent activity yet.</div>
            ) : (
              recent.map((e, idx) => (
                <div key={`${e.lastSavedAtIso}-${idx}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{e.identity.cardName || "Saved card"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{e.identity.cardCode || "—"}</div>
                      <div className="text-muted">·</div>
                      <div className="text-muted">{formatTime(e.lastSavedAtIso)}</div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span
                      className={[
                        "inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold ring-1",
                        e.status === "error" ? "bg-danger/10 text-danger ring-danger/20" : "bg-accentStrong/10 text-accentStrong ring-accentStrong/20",
                      ].join(" ")}
                    >
                      {e.status === "error" ? "Error" : "Saved"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run tests and lint**

Run:
- `npm run test:run -- src/lib/dashboard/activity.test.ts`
- `npm run lint`

Expected: PASS / no errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard/activity.ts src/lib/dashboard/activity.test.ts src/app/page.tsx
git commit -m "feat: add dashboard landing screen"
```

---

## Task 5: Update bottom tabs to Dashboard + Upload

**Files:**
- Modify: `src/components/AppBottomTabs.tsx`

- [ ] **Step 1: Update tab definitions**

Change the `tabs` array to:

```ts
const tabs: Tab[] = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];
```

- [ ] **Step 2: Update TabIcon routing**

Update `TabIcon` conditionals:
- Replace `/scan` icon branch with `/upload`
- Replace `/batch` icon branch with `/`

Suggested mapping:
- Dashboard (`/`): reuse the current “batch” document icon.
- Upload (`/upload`): reuse the current “scan” camera icon.

- [ ] **Step 3: Manual smoke test**

Expected:
- Tabs show correct labels
- Active state highlights correctly on `/` and `/upload`

- [ ] **Step 4: Commit**

```bash
git add src/components/AppBottomTabs.tsx
git commit -m "feat: update primary tabs to dashboard and upload"
```

---

## Task 6: Update in-app links that point to /scan and /batch

**Files:**
- Modify: `src/app/inventory/page.tsx`
- Modify: `src/components/OnboardingOverlay.tsx`

- [ ] **Step 1: Inventory empty state CTAs**

In `src/app/inventory/page.tsx`, replace the two CTAs with:
- Primary: `href="/upload?mode=single"` label “Upload”
- Secondary: `href="/upload?mode=batch"` label “Batch”

Example replacement:

```tsx
<div className="mt-4 grid grid-cols-2 gap-3">
  <Link
    href="/upload?mode=single"
    className="inline-flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    Upload
  </Link>
  <Link
    href="/upload?mode=batch"
    className="inline-flex h-11 items-center justify-center rounded-xl bg-surface text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    Batch
  </Link>
</div>
```

- [ ] **Step 2: Onboarding route target**

In `src/components/OnboardingOverlay.tsx`, update:

```ts
router.push("/scan");
```

to:

```ts
router.push("/upload?mode=single");
```

- [ ] **Step 3: Manual smoke test**

Expected:
- Inventory empty state buttons route into Upload
- Onboarding “Get started” and “Skip” land in Upload single mode

- [ ] **Step 4: Commit**

```bash
git add src/app/inventory/page.tsx src/components/OnboardingOverlay.tsx
git commit -m "feat: update links to use upload route"
```

---

## Task 7: Full verification pass

**Files:**
- Test: (existing suite)

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`

Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Build succeeds

- [ ] **Step 3: Manual checklist**
- Visit `/` → Dashboard renders.
- Click Upload tab → Upload renders.
- Toggle modes → URL updates + flow changes.
- Visit `/scan` and `/batch` → redirected correctly.
- Inventory empty state → routes to Upload.
- Onboarding “Get started” → routes to Upload.
