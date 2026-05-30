"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cardscout:onboarding:v1";
const LEGACY_STORAGE_KEY = "tcgpricer:onboarding:v1";
const CHANGE_EVENT = "cardscout:onboarding:change";

type Screen = {
  title: string;
  body: string;
};

const screens: Screen[] = [
  {
    title: "Scan → Sheet in seconds",
    body: "Take a photo, confirm the identity, and save a clean row with notes.",
  },
  {
    title: "Built for shops (not generic scanners)",
    body: "SG-first benchmarks, bait filtering, and auditable logs—optimized for counter speed and consistency.",
  },
  {
    title: "Buy/Sell suggestions + approval gating",
    body: "Computes shop-friendly prices and flags high-risk quotes.",
  },
  {
    title: "Inventory builds automatically",
    body: "Each successful save increments inventory so you can track intake.",
  },
];

const IMAGE_BASE_URL = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image";
const IMAGE_SIZE = "landscape_4_3";
const graphicPrompts = [
  "High-end minimal illustration, smartphone scanning a trading card on a countertop, clean studio lighting, soft neutral palette, premium mobile onboarding graphic, no text, no watermark",
  "High-end minimal illustration, price comparison cards and location pin for Singapore, subtle marketplace icons, clean studio lighting, soft neutral palette, premium mobile onboarding graphic, no text, no watermark",
  "High-end minimal illustration, price tag and shield with checkmark, tidy financial UI elements, clean studio lighting, soft neutral palette, premium mobile onboarding graphic, no text, no watermark",
  "High-end minimal illustration, organized binder of trading cards with small quantity badges, clean studio lighting, soft neutral palette, premium mobile onboarding graphic, no text, no watermark"
];
const graphicUrls = graphicPrompts.map((p) => `${IMAGE_BASE_URL}?prompt=${encodeURIComponent(p)}&image_size=${IMAGE_SIZE}`);

function Graphic({ index }: { index: number }) {
  const src = graphicUrls[index] ?? graphicUrls[0]!;
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-surface2 ring-1 ring-border">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface/35 via-white/0 to-surface/20" />
    </div>
  );
}

function readCompletion(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(STORAGE_KEY)) return true;
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return false;
  window.localStorage.setItem(STORAGE_KEY, legacy);
  return true;
}

function markCompleted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function OnboardingOverlay() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const downRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  const completed = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const onCustom = () => callback();
      const onStorage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return;
        callback();
      };
      window.addEventListener(CHANGE_EVENT, onCustom);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(CHANGE_EVENT, onCustom);
        window.removeEventListener("storage", onStorage);
      };
    },
    readCompletion,
    () => true
  );

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const canPrev = index > 0;
  const canNext = index < screens.length - 1;

  const nextLabel = useMemo(() => (canNext ? "Next" : "Get started"), [canNext]);

  function closeAndRoute() {
    markCompleted();
    setDismissed(true);
    router.push("/scan");
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    downRef.current = e.clientX;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (downRef.current === null) return;
    const delta = e.clientX - downRef.current;
    downRef.current = null;
    const threshold = 48;
    if (Math.abs(delta) < threshold) return;
    if (delta > 0 && indexRef.current > 0) setIndex((v) => Math.max(0, v - 1));
    if (delta < 0 && indexRef.current < screens.length - 1) setIndex((v) => Math.min(screens.length - 1, v + 1));
  }

  if (dismissed || completed) return null;

  const screen = screens[index]!;

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/45 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-background/80">Welcome</div>
          <button
            type="button"
            onClick={closeAndRoute}
            className="h-9 rounded-full bg-background/10 px-4 text-xs font-semibold text-background/90 ring-1 ring-background/20 transition hover:bg-background/15 active:bg-background/20"
          >
            Skip
          </button>
        </div>

        <div className="mt-4 flex-1 select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-border">
            <Graphic index={index} />
            <div className="mt-4 font-display text-[26px] leading-[1.1] tracking-tight text-foreground">{screen.title}</div>
            <div className="mt-3 text-sm leading-6 text-muted">{screen.body}</div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {screens.map((_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={[
                      "h-2 w-2 rounded-full transition",
                      i === index ? "bg-accent" : "bg-border",
                    ].join(" ")}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((v) => Math.max(0, v - 1))}
                  disabled={!canPrev}
                  className={[
                    "h-11 rounded-2xl px-4 text-sm font-semibold ring-1 transition",
                    canPrev ? "bg-surface text-foreground ring-border hover:bg-surface2 active:bg-surface2" : "bg-surface2 text-muted ring-border opacity-60",
                  ].join(" ")}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (canNext) setIndex((v) => Math.min(screens.length - 1, v + 1));
                    else closeAndRoute();
                  }}
                  className="h-11 rounded-2xl bg-accent px-5 text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99]"
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-xs leading-5 text-background/70">
            Swipe left/right to move between tips.
          </div>
        </div>
      </div>
    </div>
  );
}
