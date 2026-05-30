"use client";

import type { PricingMode } from "@/lib/types";

export function ModeToggle(props: { value: PricingMode; onChange: (v: PricingMode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-surface2 p-1 text-sm font-semibold text-muted shadow-sm ring-1 ring-border">
      <button
        type="button"
        className={[
          "h-10 rounded-lg transition",
          props.value === "buy"
            ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
            : "hover:bg-surface/60",
        ].join(" ")}
        onClick={() => props.onChange("buy")}
      >
        Buy
      </button>
      <button
        type="button"
        className={[
          "h-10 rounded-lg transition",
          props.value === "sell"
            ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
            : "hover:bg-surface/60",
        ].join(" ")}
        onClick={() => props.onChange("sell")}
      >
        Sell
      </button>
    </div>
  );
}
