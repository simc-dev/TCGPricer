"use client";

import { useEffect, useRef, useState } from "react";

import type { CardIdentity, Condition, PricingMode, QuoteResponse } from "@/lib/types";
import { ApprovalGate } from "@/components/ApprovalGate";
import { ConditionToggle } from "@/components/ConditionToggle";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/Button";

function formatMoneySgd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function confidenceLabel(confidence: number): string {
  const pct = Math.round((Number.isFinite(confidence) ? confidence : 0) * 100);
  return `${pct}%`;
}

export function VerifyCard(props: {
  identity: CardIdentity;
  quote: QuoteResponse | null;
  isQuoting: boolean;
  mode: PricingMode;
  condition: Condition;
  onModeChange: (m: PricingMode) => void;
  onConditionChange: (c: Condition) => void;
  onRescan: () => void;
  onRetryQuote: () => void;
  onSaveToSheet: () => void;
  isSavingToSheet: boolean;
  saveError: string | null;
  saveWarning?: string | null;
  saveUpdatedRange: string | null;
}) {
  const suggested = props.mode === "buy" ? props.quote?.suggested.buy : props.quote?.suggested.sell;
  const suggestedLabel = props.mode === "buy" ? "Buy price" : "Sell price";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canSave = !!props.quote && !props.isQuoting && !props.isSavingToSheet;
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmOpen) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-display text-[18px] leading-6 text-foreground">{props.identity.cardName || "Unknown card"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{props.identity.cardCode || "—"}</div>
              {props.identity.rarity ? (
                <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{props.identity.rarity}</div>
              ) : null}
              {props.identity.variant ? (
                <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">{props.identity.variant}</div>
              ) : null}
              <div className="rounded-full bg-surface2 px-2 py-1 ring-1 ring-border">
                Confidence {confidenceLabel(props.identity.confidence)}
              </div>
            </div>
          </div>
          <ApprovalGate required={!!props.quote?.manualApprovalRequired} reasons={props.quote?.manualApprovalReasons ?? []} />
        </div>

        <div className="mt-4 grid gap-3">
          <ModeToggle value={props.mode} onChange={props.onModeChange} />
          {props.mode === "sell" ? (
            <ConditionToggle value={props.condition} onChange={props.onConditionChange} />
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">{suggestedLabel}</div>
          {props.isQuoting ? (
            <div className="text-xs font-semibold text-muted">Updating…</div>
          ) : null}
        </div>
        <div className="mt-2 font-display text-[34px] tracking-tight tabular-nums text-foreground">{formatMoneySgd(suggested)}</div>

        <div className="mt-3 grid gap-2 text-sm text-muted">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="text-muted">Benchmark</span>
            <span className="font-semibold text-foreground">{props.quote?.decision?.benchmarkSource ?? "—"}</span>
            {props.quote?.decision?.benchmarkExplanation ? (
              <span className="text-muted">·</span>
            ) : null}
            {props.quote?.decision?.benchmarkExplanation ? (
              <span className="text-muted">{props.quote?.decision?.benchmarkExplanation}</span>
            ) : null}
          </div>
          {props.quote?.notes ? <div className="text-xs leading-5 text-muted">{props.quote.notes}</div> : null}
          {!props.quote && !props.isQuoting ? (
            <div className="grid gap-3 pt-1">
              <div className="text-xs leading-5 text-muted">No quote yet. Retry pricing.</div>
              <Button type="button" variant="primary" size="md" onClick={props.onRetryQuote}>
                Retry pricing
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-background/70 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <div className="grid gap-3">
            {props.saveError ? (
              <div className="rounded-2xl bg-danger/10 p-3 text-xs text-danger ring-1 ring-danger/20">{props.saveError}</div>
            ) : props.saveUpdatedRange ? (
              <div className="rounded-2xl bg-success/10 p-3 text-xs text-success ring-1 ring-success/20">
                Saved to Sheets ({props.saveUpdatedRange})
              </div>
            ) : null}
            {props.saveWarning ? (
              <div className="rounded-2xl bg-accent2/15 p-3 text-xs text-foreground ring-1 ring-accent2/25">{props.saveWarning}</div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={props.onRescan}>
                Rescan
              </Button>
              <Button type="button" variant="primary" onClick={props.onRetryQuote} disabled={props.isQuoting}>
                Refresh
              </Button>
            </div>
            <Button
              type="button"
              variant="success"
              disabled={!canSave}
              onClick={() => {
                if (!props.quote) return;
                if (props.quote.manualApprovalRequired) {
                  setConfirmOpen(true);
                  return;
                }
                props.onSaveToSheet();
              }}
            >
              {props.isSavingToSheet ? "Saving…" : "Save to Sheet"}
            </Button>
          </div>
        </div>
      </div>

      {confirmOpen && props.quote ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-surface p-5 shadow-xl ring-1 ring-border">
            <div className="font-display text-[18px] leading-6 text-foreground">Manual approval required</div>
            <div className="mt-2 text-sm leading-6 text-muted">
              This quote requires manual approval. Confirm you still want to save it to Sheets.
            </div>
            {props.quote.manualApprovalReasons.length > 0 ? (
              <div className="mt-3 rounded-xl bg-surface2 p-3 text-xs text-muted ring-1 ring-border">
                {props.quote.manualApprovalReasons.map((r) => (
                  <div key={r} className="truncate">
                    {r}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" size="md" ref={cancelRef} onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                size="md"
                onClick={() => {
                  setConfirmOpen(false);
                  props.onSaveToSheet();
                }}
              >
                Confirm save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
