"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AppTopNav } from "@/components/AppTopNav";
import { ScanCapture } from "@/components/ScanCapture";
import { VerifyCard } from "@/components/VerifyCard";
import { Button } from "@/components/ui/Button";
import { applyIdentityEdits, toEditableIdentity, type EditableIdentity } from "@/lib/batch/identityEdit";
import { buildInventoryLogRowValues } from "@/lib/google/inventoryRow";
import { buildMinimalSheetRowValues } from "@/lib/google/sheetRow";
import { applyInventoryDelta, getStoredInventory, setStoredInventory } from "@/lib/inventory/store";
import { getStoredSettings } from "@/lib/settings/storage";
import type { CardIdentity, Condition, PricingMode, QuoteResponse } from "@/lib/types";

type PendingScan = {
  id: string;
  file: File;
  previewUrl: string;
  addedAtIso: string;
};

type CurrentStage = "extracting" | "verifying" | "editing" | "error";

type CurrentScan = {
  id: string;
  file: File;
  previewUrl: string;
  stage: CurrentStage;
  identity: CardIdentity | null;
  quote: QuoteResponse | null;
  mode: PricingMode;
  condition: Condition;
  isQuoting: boolean;
  isSavingToSheet: boolean;
  saveError: string | null;
  saveWarning: string | null;
  saveUpdatedRange: string | null;
  error: string | null;
  editDraft: EditableIdentity | null;
};

type SavedEntryStatus = "saving" | "saved" | "error";

type SavedEntry = {
  id: string;
  status: SavedEntryStatus;
  lastSavedAtIso: string;
  identity: CardIdentity;
  mode: PricingMode;
  condition: Condition;
  suggestedSgd: number | null;
  updatedRange: string | null;
  error: string | null;
};

const SAVED_KEY = "batch:savedEntries:v1";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSavedTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function suggestedFor(quote: QuoteResponse | null, mode: PricingMode): number | null {
  if (!quote) return null;
  return mode === "buy" ? quote.suggested.buy : quote.suggested.sell;
}

function safeParseSavedEntries(value: string | null): SavedEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => it as Partial<SavedEntry>)
      .filter((it) => typeof it.id === "string" && typeof it.lastSavedAtIso === "string" && !!it.identity)
      .map((it) => ({
        id: it.id as string,
        status: it.status === "saving" || it.status === "saved" || it.status === "error" ? it.status : "saved",
        lastSavedAtIso: it.lastSavedAtIso as string,
        identity: it.identity as CardIdentity,
        mode: it.mode === "buy" || it.mode === "sell" ? it.mode : "buy",
        condition: it.condition === "nm" || it.condition === "lp" || it.condition === "mp" ? it.condition : "nm",
        suggestedSgd: typeof it.suggestedSgd === "number" || it.suggestedSgd === null ? (it.suggestedSgd as number | null) : null,
        updatedRange: typeof it.updatedRange === "string" || it.updatedRange === null ? (it.updatedRange as string | null) : null,
        error: typeof it.error === "string" || it.error === null ? (it.error as string | null) : null,
      }));
  } catch {
    return [];
  }
}

async function extractIdentity(file: File): Promise<CardIdentity> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/vision/extract", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as CardIdentity;
}

async function fetchQuote(input: { identity: CardIdentity; mode: PricingMode; condition: Condition }): Promise<QuoteResponse> {
  const settings = getStoredSettings();
  const res = await fetch("/api/pricing/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: input.identity,
      mode: input.mode,
      condition: input.mode === "sell" ? input.condition : null,
      enabledSources: settings.sources,
      advanced: settings.advanced,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as QuoteResponse;
}

export default function BatchPage() {
  const [queue, setQueue] = useState<PendingScan[]>([]);
  const [current, setCurrent] = useState<CurrentScan | null>(null);
  const [saved, setSaved] = useState<SavedEntry[]>(() =>
    safeParseSavedEntries(typeof window === "undefined" ? null : window.localStorage.getItem(SAVED_KEY)),
  );
  const savingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 200)));
  }, [saved]);

  useEffect(() => {
    return () => {
      for (const it of queue) URL.revokeObjectURL(it.previewUrl);
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
    };
  }, []);

  function startCurrent(scan: PendingScan) {
    setCurrent({
      id: scan.id,
      file: scan.file,
      previewUrl: scan.previewUrl,
      stage: "extracting",
      identity: null,
      quote: null,
      mode: "buy",
      condition: "nm",
      isQuoting: false,
      isSavingToSheet: false,
      saveError: null,
      saveWarning: null,
      saveUpdatedRange: null,
      error: null,
      editDraft: null,
    });
  }

  function discardCurrent() {
    setCurrent((c) => {
      if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
      return null;
    });
    setQueue((q) => {
      if (q.length === 0) return q;
      const [next, ...rest] = q;
      startCurrent(next);
      return rest;
    });
  }

  function enqueueFile(file: File) {
    const scan: PendingScan = {
      id: newId(),
      file,
      previewUrl: URL.createObjectURL(file),
      addedAtIso: new Date().toISOString(),
    };
    if (!current) {
      startCurrent(scan);
      return;
    }
    setQueue((q) => [...q, scan]);
  }

  useEffect(() => {
    if (!current || current.stage !== "extracting") return;
    let cancelled = false;
    extractIdentity(current.file)
      .then((id) => {
        if (cancelled) return;
        setCurrent((c) =>
          c && c.id === current.id
            ? { ...c, identity: id, stage: "verifying", quote: null, error: null, saveError: null, saveUpdatedRange: null }
            : c,
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setCurrent((c) =>
          c && c.id === current.id ? { ...c, stage: "error", error: e instanceof Error ? e.message : "Failed to extract identity" } : c,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.stage]);

  useEffect(() => {
    if (!current?.identity) return;
    if (current.stage !== "verifying") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setCurrent((c) => (c && c.id === current.id ? { ...c, isQuoting: true, error: null } : c));
    });
    fetchQuote({ identity: current.identity, mode: current.mode, condition: current.condition })
      .then((q) => {
        if (cancelled) return;
        setCurrent((c) => (c && c.id === current.id ? { ...c, quote: q } : c));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setCurrent((c) => (c && c.id === current.id ? { ...c, quote: null, error: e instanceof Error ? e.message : "Failed to fetch quote" } : c));
      })
      .finally(() => {
        if (cancelled) return;
        setCurrent((c) => (c && c.id === current.id ? { ...c, isQuoting: false } : c));
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.stage, current?.identity, current?.mode, current?.condition]);

  async function saveToSheet() {
    if (!current?.identity || !current.quote) return;
    if (savingRef.current) return;
    savingRef.current = true;

    const entryId = current.id;
    const nowIso = new Date().toISOString();
    const suggestedSgd = suggestedFor(current.quote, current.mode);

    setCurrent((c) =>
      c && c.id === entryId ? { ...c, isSavingToSheet: true, saveError: null, saveWarning: null, saveUpdatedRange: null } : c,
    );
    setSaved((s) => [
      {
        id: entryId,
        status: "saving",
        lastSavedAtIso: nowIso,
        identity: current.identity!,
        mode: current.mode,
        condition: current.condition,
        suggestedSgd,
        updatedRange: null,
        error: null,
      },
      ...s.filter((it) => it.id !== entryId),
    ]);

    try {
      const values = buildMinimalSheetRowValues({
        timestampIso: nowIso,
        identity: current.identity,
        mode: current.mode,
        condition: current.condition,
        quote: current.quote,
      });
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { updatedRange?: unknown };
      const updatedRange = typeof json.updatedRange === "string" ? json.updatedRange : "unknown";

      setCurrent((c) => (c && c.id === entryId ? { ...c, isSavingToSheet: false, saveUpdatedRange: updatedRange } : c));
      setSaved((s) =>
        s.map((it) =>
          it.id === entryId ? { ...it, status: "saved", lastSavedAtIso: nowIso, updatedRange, error: null, suggestedSgd } : it,
        ),
      );

      const nextInventory = applyInventoryDelta({
        state: getStoredInventory(),
        identity: current.identity,
        delta: 1,
        reason: "saved",
        occurredAtIso: nowIso,
        mode: current.mode,
        condition: current.mode === "sell" ? current.condition : null,
        suggestedSgd,
        decision: current.quote.decision,
      });
      setStoredInventory(nextInventory);

      try {
        const invValues = buildInventoryLogRowValues({
          timestampIso: nowIso,
          identity: current.identity,
          delta: 1,
          reason: "saved",
          mode: current.mode,
          condition: current.mode === "sell" ? current.condition : null,
          suggestedSgd,
          decision: current.quote.decision,
        });
        const invRes = await fetch("/api/sheets/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabName: "Inventory Log", values: invValues }),
        });
        if (!invRes.ok) throw new Error(await invRes.text());
      } catch (e: unknown) {
        setCurrent((c) => (c && c.id === entryId ? { ...c, saveWarning: e instanceof Error ? e.message : "Saved, but failed to append Inventory Log" } : c));
      }

      discardCurrent();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save to Sheets";
      setCurrent((c) => (c && c.id === entryId ? { ...c, isSavingToSheet: false, saveError: message } : c));
      setSaved((s) => s.map((it) => (it.id === entryId ? { ...it, status: "error", error: message } : it)));
    } finally {
      savingRef.current = false;
    }
  }

  const currentSuggested = useMemo(() => {
    if (!current) return null;
    return suggestedFor(current.quote, current.mode);
  }, [current?.quote, current?.mode]);

  const queuePreviews = useMemo(() => queue.slice(0, 8), [queue]);

  return (
    <main className="flex-1">
      <AppTopNav active="batch" subtitle="Batch queue" />
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-6">

        <div className="mt-6 grid gap-4">
          <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display text-2xl font-semibold tracking-tight text-foreground">Queue scans</div>
                <div className="mt-2 text-sm leading-6 text-muted">
                  Add multiple photos, then confirm each entry. Confirm saves automatically to Google Sheets.
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold text-muted">Pending</div>
                <div className="text-lg font-semibold text-foreground">{(current ? 1 : 0) + queue.length}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <ScanCapture
                disabled={false}
                previewUrl={null}
                onFile={(f) => {
                  enqueueFile(f);
                }}
              />

              {queuePreviews.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {queuePreviews.map((it, idx) => (
                    <div key={it.id} className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-surface2 ring-1 ring-border">
                      <img alt={`Queued scan ${idx + 1}`} src={it.previewUrl} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                  {queue.length > queuePreviews.length ? (
                    <div className="grid h-20 w-14 shrink-0 place-items-center rounded-xl bg-surface2 text-xs font-semibold text-muted ring-1 ring-border">
                      +{queue.length - queuePreviews.length}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {current ? (
            <div className="grid gap-4">
              {current.error ? (
                <div className="rounded-2xl bg-surface2 p-4 text-sm text-foreground ring-1 ring-border border-l-4 border-danger">{current.error}</div>
              ) : null}

              <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
                <div className="relative aspect-[3/2] w-full bg-surface2">
                  <img alt="Current scan" src={current.previewUrl} className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </div>

              {current.stage === "extracting" ? (
                <div className="rounded-2xl bg-surface/85 p-4 text-sm text-muted shadow-sm ring-1 ring-border backdrop-blur">
                  Extracting identity…
                </div>
              ) : current.stage === "error" ? (
                <div className="grid gap-3">
                  <Button type="button" variant="secondary" onClick={discardCurrent}>
                    Discard and continue
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setCurrent((c) => (c ? { ...c, stage: "extracting", error: null } : c))}
                  >
                    Retry extract
                  </Button>
                </div>
              ) : current.identity ? (
                <div className="grid gap-4">
                  {current.stage === "editing" && current.editDraft ? (
                    <div className="rounded-2xl bg-surface/85 p-4 shadow-sm ring-1 ring-border backdrop-blur">
                      <div className="text-sm font-semibold text-foreground">Edit identity</div>
                      <div className="mt-1 text-xs leading-5 text-muted">
                        Update fields, then apply changes to refresh the quote. Nothing is saved until you confirm.
                      </div>
                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1">
                          <div className="text-xs font-semibold text-muted">Card code</div>
                          <input
                            value={current.editDraft.cardCode}
                            className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accentStrong"
                            onChange={(e) =>
                              setCurrent((c) =>
                                c ? { ...c, editDraft: c.editDraft ? { ...c.editDraft, cardCode: e.target.value } : c.editDraft } : c,
                              )
                            }
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-xs font-semibold text-muted">Card name</div>
                          <input
                            value={current.editDraft.cardName}
                            className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accentStrong"
                            onChange={(e) =>
                              setCurrent((c) =>
                                c ? { ...c, editDraft: c.editDraft ? { ...c.editDraft, cardName: e.target.value } : c.editDraft } : c,
                              )
                            }
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-xs font-semibold text-muted">Rarity</div>
                          <input
                            value={current.editDraft.rarity}
                            placeholder="Optional"
                            className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accentStrong"
                            onChange={(e) =>
                              setCurrent((c) =>
                                c ? { ...c, editDraft: c.editDraft ? { ...c.editDraft, rarity: e.target.value } : c.editDraft } : c,
                              )
                            }
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-xs font-semibold text-muted">Variant</div>
                          <select
                            value={current.editDraft.variant}
                            className="h-11 rounded-xl bg-surface px-3 text-sm text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accentStrong"
                            onChange={(e) =>
                              setCurrent((c) =>
                                c
                                  ? {
                                      ...c,
                                      editDraft: c.editDraft ? { ...c.editDraft, variant: e.target.value as EditableIdentity["variant"] } : c.editDraft,
                                    }
                                  : c,
                              )
                            }
                          >
                            <option value="">(none)</option>
                            <option value="standard">standard</option>
                            <option value="parallel">parallel</option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={() => setCurrent((c) => (c ? { ...c, stage: "verifying", editDraft: null } : c))}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => {
                            setCurrent((c) => {
                              if (!c?.identity || !c.editDraft) return c;
                              return { ...c, identity: applyIdentityEdits(c.identity, c.editDraft), stage: "verifying", editDraft: null, quote: null };
                            });
                          }}
                        >
                          Apply changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setCurrent((c) =>
                          c?.identity ? { ...c, stage: "editing", editDraft: toEditableIdentity(c.identity), error: null } : c,
                        )
                      }
                    >
                      Edit identity
                    </Button>
                  )}

                  <VerifyCard
                    identity={current.identity}
                    quote={current.quote}
                    isQuoting={current.isQuoting}
                    mode={current.mode}
                    condition={current.condition}
                    onModeChange={(m) => setCurrent((c) => (c ? { ...c, mode: m, quote: null, error: null } : c))}
                    onConditionChange={(cond) => setCurrent((c) => (c ? { ...c, condition: cond, quote: null, error: null } : c))}
                    onRescan={discardCurrent}
                    onRetryQuote={() => {
                      if (!current.identity) return;
                      setCurrent((c) => (c ? { ...c, stage: "verifying", quote: null, error: null } : c));
                    }}
                    onSaveToSheet={saveToSheet}
                    isSavingToSheet={current.isSavingToSheet}
                    saveError={current.saveError}
                    saveWarning={current.saveWarning}
                    saveUpdatedRange={current.saveUpdatedRange}
                  />

                  <div className="rounded-2xl bg-surface2 p-4 text-xs leading-5 text-muted ring-1 ring-border">
                    <div className="font-semibold text-foreground">Current suggested</div>
                    <div className="mt-1">{currentSuggested === null ? "—" : `$${currentSuggested.toFixed(2)} SGD`}</div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface/85 p-4 text-sm text-muted shadow-sm ring-1 ring-border backdrop-blur">
              No active scan. Add a photo to start.
            </div>
          )}

          <div className="rounded-3xl bg-surface/85 p-5 shadow-sm ring-1 ring-border backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display text-lg font-semibold text-foreground">Saved entries</div>
                <div className="mt-1 text-sm leading-6 text-muted">Stored locally for this device (status + last saved time).</div>
              </div>
              <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setSaved([])}>
                Clear
              </Button>
            </div>

            {saved.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-surface2 p-4 text-sm text-muted ring-1 ring-border">No saved entries yet.</div>
            ) : (
              <div className="mt-4 grid gap-3">
                {saved.slice(0, 20).map((it) => (
                  <div key={it.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{it.identity.cardName || "Unknown card"}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <div className="rounded-full bg-surface2 px-2 py-1 font-medium ring-1 ring-border">{it.identity.cardCode || "—"}</div>
                          <div className="rounded-full bg-surface2 px-2 py-1 font-medium ring-1 ring-border">
                            {it.mode === "buy" ? "Buy" : "Sell"}
                            {it.mode === "sell" ? ` · ${it.condition.toUpperCase()}` : ""}
                          </div>
                          <div className="rounded-full bg-surface2 px-2 py-1 font-medium ring-1 ring-border">
                            {it.suggestedSgd === null ? "—" : `$${it.suggestedSgd.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ring-1",
                            it.status === "saved"
                              ? "bg-surface2 text-success ring-border"
                              : it.status === "saving"
                                ? "bg-surface2 text-muted ring-border"
                                : "bg-surface2 text-danger ring-border",
                          ].join(" ")}
                        >
                          {it.status === "saved" ? "Saved" : it.status === "saving" ? "Saving" : "Error"}
                        </div>
                        <div className="mt-2 text-[11px] font-medium text-muted">{formatSavedTime(it.lastSavedAtIso)}</div>
                      </div>
                    </div>
                    {it.status === "saved" && it.updatedRange ? (
                      <div className="mt-3 text-xs text-muted">Sheets: {it.updatedRange}</div>
                    ) : it.status === "error" && it.error ? (
                      <div className="mt-3 rounded-xl bg-surface2 p-3 text-xs text-danger ring-1 ring-border border-l-4 border-danger">{it.error}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
