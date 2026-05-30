import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-[max(24px,env(safe-area-inset-top))]">
        <div className="rounded-3xl bg-surface/85 p-6 shadow-sm ring-1 ring-border backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">TCG Pricer</div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">Pricing that feels effortless</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Snap a photo, confirm the identity, and save a buy/sell suggestion with clear source notes and manual-approval gating.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/scan"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-sm ring-1 ring-accentStrong transition hover:bg-accentStrong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Scan
            </Link>
            <Link
              href="/batch"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-surface text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Batch
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-surface/85 p-5 text-sm leading-6 text-muted shadow-sm ring-1 ring-border backdrop-blur">
          <div className="font-semibold text-foreground">Capture tips</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">
            <li>Bright lighting, card flat, fill the frame.</li>
            <li>Avoid glare by tilting the phone slightly.</li>
            <li>For foils, take two photos and pick the clearest.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
