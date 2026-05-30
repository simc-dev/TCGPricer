"use client";

import { useEffect, useMemo, useState } from "react";

import { AppTopNav } from "@/components/AppTopNav";
import { ScanCapture } from "@/components/ScanCapture";
import { VerifyCard } from "@/components/VerifyCard";
import { buildInventoryLogRowValues } from "@/lib/google/inventoryRow";
import { buildMinimalSheetRowValues } from "@/lib/google/sheetRow";
import { applyInventoryDelta, getStoredInventory, setStoredInventory } from "@/lib/inventory/store";
import { getStoredSettings } from "@/lib/settings/storage";
import type { CardIdentity, Condition, PricingMode, QuoteResponse } from "@/lib/types";

type Stage = "capture" | "extracting" | "verifying";

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

export default function ScanPage() {
  const [stage, setStage] = useState<Stage>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [identity, setIdentity] = useState<CardIdentity | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [mode, setMode] = useState<PricingMode>("buy");
  const [condition, setCondition] = useState<Condition>("nm");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSavingToSheet, setIsSavingToSheet] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveUpdatedRange, setSaveUpdatedRange] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function requestQuote(input: { identity: CardIdentity; mode: PricingMode; condition: Condition }) {
    setIsQuoting(true);
    setError(null);
    setSaveError(null);
    setSaveUpdatedRange(null);
    setSaveWarning(null);
    try {
      const q = await fetchQuote(input);
      setQuote(q);
    } catch (e: unknown) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Failed to fetch quote");
    } finally {
      setIsQuoting(false);
    }
  }

  function reset() {
    setStage("capture");
    setFile(null);
    setIdentity(null);
    setQuote(null);
    setMode("buy");
    setCondition("nm");
    setIsQuoting(false);
    setIsSavingToSheet(false);
    setSaveError(null);
    setSaveUpdatedRange(null);
    setSaveWarning(null);
    setError(null);
  }

  async function saveToSheet() {
    if (!identity || !quote) return;
    setIsSavingToSheet(true);
    setSaveError(null);
    setSaveUpdatedRange(null);
    setSaveWarning(null);
    try {
      const nowIso = new Date().toISOString();
      const values = buildMinimalSheetRowValues({
        timestampIso: nowIso,
        identity,
        mode,
        condition,
        quote,
      });
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { updatedRange?: unknown };
      setSaveUpdatedRange(typeof json.updatedRange === "string" ? json.updatedRange : "unknown");

      const suggestedSgd = mode === "buy" ? quote.suggested.buy : quote.suggested.sell;
      const nextInventory = applyInventoryDelta({
        state: getStoredInventory(),
        identity,
        delta: 1,
        reason: "saved",
        occurredAtIso: nowIso,
        mode,
        condition: mode === "sell" ? condition : null,
        suggestedSgd,
        decision: quote.decision,
      });
      setStoredInventory(nextInventory);

      try {
        const invValues = buildInventoryLogRowValues({
          timestampIso: nowIso,
          identity,
          delta: 1,
          reason: "saved",
          mode,
          condition: mode === "sell" ? condition : null,
          suggestedSgd,
          decision: quote.decision,
        });
        const invRes = await fetch("/api/sheets/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabName: "Inventory Log", values: invValues }),
        });
        if (!invRes.ok) throw new Error(await invRes.text());
      } catch (e: unknown) {
        setSaveWarning(e instanceof Error ? e.message : "Saved, but failed to append Inventory Log");
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save to Sheets");
    } finally {
      setIsSavingToSheet(false);
    }
  }

  return (
    <main className="flex-1">
      <AppTopNav active="scan" subtitle="Scan-to-Sheet" />
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-6">

        {error ? (
          <div className="mt-4 rounded-2xl bg-surface2 p-4 text-sm text-foreground ring-1 ring-border border-l-4 border-danger">
            {error}
          </div>
        ) : null}

        {stage !== "verifying" ? (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <div className="font-display text-2xl font-semibold tracking-tight text-foreground">Scan a card</div>
              <div className="text-sm leading-6 text-muted">Take a photo, then confirm the identity and price.</div>
            </div>

            <ScanCapture
              disabled={stage === "extracting"}
              previewUrl={previewUrl}
              onClear={() => {
                setFile(null);
                setError(null);
                setSaveWarning(null);
              }}
              onFile={async (f) => {
                setFile(f);
                setError(null);
                setSaveError(null);
                setSaveUpdatedRange(null);
                setSaveWarning(null);
                setStage("extracting");
                setIdentity(null);
                setQuote(null);

                try {
                  const id = await extractIdentity(f);
                  setIdentity(id);
                  setStage("verifying");
                  void requestQuote({ identity: id, mode, condition });
                } catch (e: unknown) {
                  setStage("capture");
                  setError(e instanceof Error ? e.message : "Failed to extract identity");
                }
              }}
            />

            {stage === "extracting" ? (
              <div className="rounded-3xl bg-surface/85 p-5 text-sm text-muted shadow-sm ring-1 ring-border backdrop-blur">
                <div className="font-semibold text-foreground">Reading card details</div>
                <div className="mt-1 text-xs leading-5 text-muted">Hold steady. This usually takes a moment.</div>
              </div>
            ) : null}
          </div>
        ) : identity ? (
          <div className="mt-6 grid gap-4">
            {previewUrl ? (
              <div className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border">
                <div className="relative aspect-[3/2] w-full bg-surface2">
                  <img alt="Captured card" src={previewUrl} className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </div>
            ) : null}

            <VerifyCard
              identity={identity}
              quote={quote}
              isQuoting={isQuoting}
              mode={mode}
              condition={condition}
              onModeChange={(m) => {
                setMode(m);
                setError(null);
                setSaveError(null);
                setSaveUpdatedRange(null);
                setSaveWarning(null);
                if (identity) void requestQuote({ identity, mode: m, condition });
              }}
              onConditionChange={(c) => {
                setCondition(c);
                setError(null);
                setSaveError(null);
                setSaveUpdatedRange(null);
                setSaveWarning(null);
                if (identity) void requestQuote({ identity, mode, condition: c });
              }}
              onRescan={reset}
              onRetryQuote={() => {
                if (!identity) return;
                void requestQuote({ identity, mode, condition });
              }}
              onSaveToSheet={saveToSheet}
              isSavingToSheet={isSavingToSheet}
              saveError={saveError}
              saveWarning={saveWarning}
              saveUpdatedRange={saveUpdatedRange}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
