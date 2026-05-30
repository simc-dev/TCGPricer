"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { computeInventoryKpis } from "@/lib/inventory/kpis";
import { makeDemoInventoryState, notifyStoredInventoryChanged, setStoredInventory } from "@/lib/inventory/store";
import { useStoredInventory } from "@/lib/inventory/useStoredInventory";
import type { InventoryItem } from "@/lib/inventory/types";

function formatUpdatedTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatSgd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
    currencyDisplay: "narrowSymbol",
  }).format(n);
}

function matchesQuery(it: InventoryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    it.cardName.toLowerCase().includes(q) ||
    it.cardCode.toLowerCase().includes(q) ||
    (it.rarity ?? "").toLowerCase().includes(q) ||
    (it.variant ?? "").toLowerCase().includes(q)
  );
}

export default function InventoryPage() {
  const state = useStoredInventory();
  const [query, setQuery] = useState("");

  const kpis = useMemo(() => computeInventoryKpis(state), [state]);

  const items = useMemo(() => {
    const all = Object.values(state.items ?? {}).sort((a, b) => b.lastSeenAtIso.localeCompare(a.lastSeenAtIso));
    return all.filter((it) => matchesQuery(it, query));
  }, [state, query]);

  return (
    <main className="flex-1">
      <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">Inventory</div>
            <div className="truncate text-xs text-muted">Saved cards tracked locally.</div>
          </div>
          <div className="shrink-0 rounded-full bg-surface2 px-2 py-1 text-xs font-semibold text-muted ring-1 ring-border">
            {Object.keys(state.items ?? {}).length} items
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
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

        <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <label className="grid gap-2">
            <div className="text-sm font-semibold text-foreground">Search</div>
            <input
              value={query}
              placeholder="Name, code, rarity…"
              className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accentStrong"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl bg-surface/85 p-6 text-sm leading-6 text-muted shadow-sm ring-1 ring-border backdrop-blur">
            <div className="font-display text-base font-semibold text-foreground">No items yet</div>
            <div className="mt-2 text-muted">Save a scan to Sheets and this page will start tracking quantities.</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/scan"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Scan
              </Link>
              <Link
                href="/batch"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-surface text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Batch
              </Link>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => {
                const next = makeDemoInventoryState(new Date().toISOString());
                setStoredInventory(next);
              }}
            >
              Add demo cards
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((it) => (
              <Link
                key={it.key}
                href={`/inventory/${encodeURIComponent(it.key)}`}
                className="group rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border transition hover:bg-surface backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{it.cardName || "Unknown card"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                      <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{it.cardCode || "—"}</div>
                      {it.variant ? (
                        <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{it.variant}</div>
                      ) : null}
                      {it.rarity ? (
                        <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{it.rarity}</div>
                      ) : null}
                      <div className="text-muted">·</div>
                      <div className="text-muted">Updated {formatUpdatedTime(it.lastSeenAtIso)}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold text-muted">Qty</div>
                    <div className="mt-1 inline-flex items-center rounded-2xl bg-accentStrong px-3 py-1.5 text-sm font-semibold tabular-nums text-white">
                      ×{it.quantityTotal}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <div>{it.events.length} events</div>
                  <div className="font-semibold text-muted group-hover:text-foreground">View details</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Button type="button" variant="secondary" onClick={() => notifyStoredInventoryChanged()}>
          Refresh list
        </Button>
      </div>
    </main>
  );
}
