"use client";

import type { Condition } from "@/lib/types";

const options: Array<{ value: Condition; label: string }> = [
  { value: "nm", label: "NM" },
  { value: "lp", label: "LP" },
  { value: "mp", label: "MP" },
];

export function ConditionToggle(props: { value: Condition; onChange: (v: Condition) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={[
            "h-10 flex-1 rounded-xl text-sm font-semibold ring-1 transition active:scale-[0.99]",
            props.value === o.value
              ? "bg-accent text-white ring-accentStrong"
              : "bg-surface text-foreground ring-border hover:bg-surface2",
          ].join(" ")}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
