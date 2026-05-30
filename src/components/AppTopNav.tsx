"use client";

import Link from "next/link";

export function AppTopNav(props: { active: "scan" | "batch"; subtitle?: string }) {
  return (
    <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/75 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">TCG Pricer</div>
            {props.subtitle ? <div className="truncate text-xs text-muted">{props.subtitle}</div> : null}
          </Link>
          <div className="rounded-full bg-surface2 p-1 text-sm font-semibold text-foreground ring-1 ring-border shadow-sm">
            <div className="grid grid-cols-2">
              <Link
                href="/scan"
                className={[
                  "h-9 rounded-full px-3 grid place-items-center transition",
                  props.active === "scan"
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted hover:bg-surface/70 hover:text-foreground",
                ].join(" ")}
              >
                Scan
              </Link>
              <Link
                href="/batch"
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
