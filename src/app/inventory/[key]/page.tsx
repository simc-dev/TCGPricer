"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { applyInventoryDelta, setStoredInventory } from "@/lib/inventory/store";
import { useStoredInventory } from "@/lib/inventory/useStoredInventory";
import type { InventoryEvent, InventoryItem } from "@/lib/inventory/types";
import type { CardIdentity, CardVariant } from "@/lib/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function deltaLabel(delta: number): string {
  if (!Number.isFinite(delta)) return "0";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function reasonLabel(reason: InventoryEvent["reason"]): string {
  if (reason === "saved") return "Saved";
  return "Adjust";
}

function safeKey(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export default function InventoryDetailPage() {
  const params = useParams() as unknown as Record<string, unknown>;
  const key = useMemo(() => {
    const raw = safeKey(params.key);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params]);

  const state = useStoredInventory();

  const item: InventoryItem | null = key ? state.items[key] ?? null : null;

  function applyDelta(delta: number) {
    if (!item || !key) return;
    if (delta < 0 && item.quantityTotal <= 0) return;
    const nowIso = new Date().toISOString();
    const variant: CardVariant | null =
      item.variant === "standard" || item.variant === "parallel" ? (item.variant as CardVariant) : null;
    const identity: CardIdentity = {
      cardCode: item.cardCode,
      cardName: item.cardName,
      rarity: item.rarity,
      variant,
      setCode: null,
      language: "unknown",
      confidence: 1,
      ambiguity: false,
    };
    const next = applyInventoryDelta({
      state,
      identity,
      delta,
      reason: "adjust",
      occurredAtIso: nowIso,
    });
    setStoredInventory(next);
  }

  const recentEvents = useMemo(() => {
    if (!item) return [];
    return item.events.slice(0, 20);
  }, [item]);

  return (
    <main className="flex-1">
      <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">Inventory item</div>
            <div className="truncate text-xs text-muted">{item ? item.cardCode : "—"}</div>
          </div>
          <Link
            href="/inventory"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-surface px-3 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
        {!item ? (
          <div className="rounded-3xl bg-surface/85 p-6 text-sm leading-6 text-muted shadow-sm ring-1 ring-border backdrop-blur">
            <div className="font-display text-base font-semibold text-foreground">Not found</div>
            <div className="mt-2 text-muted">This inventory key isn’t on this device.</div>
            <div className="mt-4">
              <Link
                href="/inventory"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Back to Inventory
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-foreground">{item.cardName || "Unknown card"}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                    <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{item.cardCode || "—"}</div>
                    {item.variant ? (
                      <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{item.variant}</div>
                    ) : null}
                    {item.rarity ? (
                      <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{item.rarity}</div>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-muted">Qty</div>
                  <div className="mt-1 inline-flex items-center rounded-2xl bg-accentStrong px-3 py-1.5 text-sm font-semibold tabular-nums text-white">
                    ×{item.quantityTotal}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" disabled={item.quantityTotal <= 0} onClick={() => applyDelta(-1)}>
                  −1
                </Button>
                <Button type="button" variant="primary" onClick={() => applyDelta(1)}>
                  +1
                </Button>
              </div>
            </div>

            <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-lg font-semibold text-foreground">Recent events</div>
                <div className="shrink-0 rounded-full bg-surface2 px-2 py-1 text-xs font-semibold text-muted ring-1 ring-border">
                  {item.events.length}
                </div>
              </div>

              {recentEvents.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-surface2 p-4 text-sm text-muted ring-1 ring-border">No events yet.</div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {recentEvents.map((ev, idx) => (
                    <div key={`${ev.occurredAtIso}-${idx}`} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{reasonLabel(ev.reason)}</div>
                          <div className="mt-1 text-xs text-muted">{formatTime(ev.occurredAtIso)}</div>
                        </div>
                        <div
                          className={[
                            "shrink-0 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 tabular-nums",
                            ev.delta >= 0 ? "bg-surface2 text-success ring-border" : "bg-surface2 text-danger ring-border",
                          ].join(" ")}
                        >
                          {deltaLabel(ev.delta)}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted">
                        {ev.mode ? (
                          <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">
                            {ev.mode === "buy" ? "Buy" : "Sell"}
                            {ev.mode === "sell" && ev.condition ? ` · ${String(ev.condition).toUpperCase()}` : ""}
                          </div>
                        ) : null}
                        {ev.suggestedSgd !== null && typeof ev.suggestedSgd === "number" ? (
                          <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">${ev.suggestedSgd.toFixed(2)}</div>
                        ) : null}
                        {ev.benchmarkSource ? (
                          <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{ev.benchmarkSource}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
