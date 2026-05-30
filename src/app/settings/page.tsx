"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getStoredSettings, setStoredSettings } from "@/lib/settings/storage";
import { DEFAULT_SETTINGS, type AppSettings, type SellRoundingPreset } from "@/lib/settings/types";
import type { PriceSource } from "@/lib/types";

const sourceMeta: Array<{ key: PriceSource; label: string; description: string }> = [
  { key: "carousell", label: "Carousell", description: "Singapore marketplace listings (SGD)." },
  { key: "mercari", label: "Mercari", description: "Japan resale listings (JPY, FX converted)." },
  { key: "pricecharting", label: "PriceCharting", description: "Reference pricing (USD/SGD, normalized)." },
  { key: "yuyutei", label: "Yuyutei", description: "Japan storefront sell prices (JPY, FX converted)." },
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatSavedTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function presetLabel(p: SellRoundingPreset): string {
  if (p === "off") return "Off";
  if (p === "conservative") return "Conservative";
  return "Retail";
}

export default function SettingsPage() {
  const [baseline, setBaseline] = useState<AppSettings>(() => getStoredSettings());
  const [draft, setDraft] = useState<AppSettings>(() => baseline);
  const [savedAtIso, setSavedAtIso] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  return (
    <main className="flex-1">
      <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">Settings</div>
            <div className="truncate text-xs text-muted">Applies to Scan + Batch on this device.</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              setSavedAtIso(null);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
        {savedAtIso ? (
          <div className="rounded-2xl bg-surface2 p-4 text-xs text-foreground ring-1 ring-border border-l-4 border-success">
            Saved {formatSavedTime(savedAtIso)}
          </div>
        ) : null}

        <section className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold text-foreground">Sources</div>
              <div className="mt-1 text-sm leading-6 text-muted">Disable sources you don’t want to fetch during pricing.</div>
            </div>
            <div className="shrink-0 rounded-full bg-surface2 px-2 py-1 text-xs font-semibold text-muted ring-1 ring-border">
              {Object.values(draft.sources).filter(Boolean).length}/{Object.keys(draft.sources).length} enabled
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {sourceMeta.map((s) => {
              const on = draft.sources[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={[
                    "w-full rounded-2xl p-4 text-left ring-1 transition",
                    on ? "bg-surface ring-border hover:bg-surface2" : "bg-surface2 ring-border hover:bg-surface",
                  ].join(" ")}
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      sources: { ...d.sources, [s.key]: !d.sources[s.key] },
                    }));
                    setSavedAtIso(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{s.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted">{s.description}</div>
                    </div>
                    <div
                      className={[
                        "shrink-0 inline-flex h-7 items-center rounded-full px-2 text-xs font-semibold ring-1",
                        on ? "bg-surface2 text-success ring-border" : "bg-surface text-muted ring-border",
                      ].join(" ")}
                    >
                      {on ? "On" : "Off"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="font-display text-lg font-semibold text-foreground">Advanced</div>
          <div className="mt-1 text-sm leading-6 text-muted">Fine-tune buylist math and sell rounding behavior.</div>

          <div className="mt-5 grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-end justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">Buylist multiplier</div>
                <div className="shrink-0 rounded-full bg-surface2 px-2 py-1 text-xs font-semibold tabular-nums text-muted ring-1 ring-border">
                  ×{draft.advanced.buylistMultiplier.toFixed(2)}
                </div>
              </div>
              <input
                type="range"
                min={0.3}
                max={0.95}
                step={0.05}
                value={draft.advanced.buylistMultiplier}
                className="w-full accent-accentStrong"
                onChange={(e) => {
                  const next = clamp(Number(e.target.value), 0.05, 1.2);
                  setDraft((d) => ({ ...d, advanced: { ...d.advanced, buylistMultiplier: next } }));
                  setSavedAtIso(null);
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface2 p-3 text-xs leading-5 text-muted ring-1 ring-border">
                  Lower multipliers are more conservative. Suggested buy = benchmark × multiplier.
                </div>
                <label className="grid gap-1">
                  <div className="text-xs font-semibold text-muted">Exact value</div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    min={0}
                    max={2}
                    value={draft.advanced.buylistMultiplier}
                    className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accentStrong"
                    onChange={(e) => {
                      const next = clamp(Number(e.target.value), 0.05, 2);
                      setDraft((d) => ({ ...d, advanced: { ...d.advanced, buylistMultiplier: next } }));
                      setSavedAtIso(null);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold text-foreground">Buy rounding</div>
              <div className="grid grid-cols-2 rounded-xl bg-surface2 p-1 text-sm font-semibold text-muted shadow-sm ring-1 ring-border">
                {[0.5, 1].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={[
                      "h-10 rounded-lg transition",
                      draft.advanced.buyRounding === v
                        ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                        : "hover:bg-surface/70 hover:text-foreground",
                    ].join(" ")}
                    onClick={() => {
                      setDraft((d) => ({ ...d, advanced: { ...d.advanced, buyRounding: v as 0.5 | 1 } }));
                      setSavedAtIso(null);
                    }}
                  >
                    {v === 0.5 ? "$0.50" : "$1.00"}
                  </button>
                ))}
              </div>
              <div className="text-xs leading-5 text-muted">Rounds buy suggestions to the nearest increment.</div>
            </div>

            <div className="grid gap-3">
              <div className="text-sm font-semibold text-foreground">Sell condition discounts</div>
              <div className="grid grid-cols-3 gap-3">
                {(["nm", "lp", "mp"] as const).map((cond) => (
                  <label key={cond} className="grid gap-1">
                    <div className="text-xs font-semibold text-muted">{cond.toUpperCase()}</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={90}
                      step={1}
                      value={Math.round(clamp(draft.advanced.conditionDiscounts[cond] * 100, 0, 90))}
                      className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accentStrong"
                      onChange={(e) => {
                        const pct = clamp(Number(e.target.value), 0, 90);
                        setDraft((d) => ({
                          ...d,
                          advanced: {
                            ...d.advanced,
                            conditionDiscounts: { ...d.advanced.conditionDiscounts, [cond]: pct / 100 },
                          },
                        }));
                        setSavedAtIso(null);
                      }}
                    />
                    <div className="text-[11px] font-medium text-muted">%</div>
                  </label>
                ))}
              </div>
              <div className="text-xs leading-5 text-muted">Applied to the benchmark before sell rounding.</div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold text-foreground">Sell rounding preset</div>
              <div className="grid grid-cols-3 rounded-xl bg-surface2 p-1 text-sm font-semibold text-muted shadow-sm ring-1 ring-border">
                {(["off", "conservative", "retail"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={[
                      "h-10 rounded-lg transition",
                      draft.advanced.sellRoundingPreset === p
                        ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                        : "hover:bg-surface/70 hover:text-foreground",
                    ].join(" ")}
                    onClick={() => {
                      setDraft((d) => ({ ...d, advanced: { ...d.advanced, sellRoundingPreset: p } }));
                      setSavedAtIso(null);
                    }}
                  >
                    {presetLabel(p)}
                  </button>
                ))}
              </div>
              <div className="text-xs leading-5 text-muted">Retail rounds to $1, Conservative rounds to $0.50, Off keeps decimals.</div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-surface/80 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const next = getStoredSettings();
                  setBaseline(next);
                  setDraft(next);
                  setSavedAtIso(null);
                }}
              >
                Revert
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!dirty}
                onClick={() => {
                  setStoredSettings(draft);
                  setBaseline(draft);
                  setSavedAtIso(new Date().toISOString());
                }}
              >
                Save settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
