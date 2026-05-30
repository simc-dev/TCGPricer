"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
};

const tabs: Tab[] = [
  { href: "/scan", label: "Scan" },
  { href: "/batch", label: "Batch" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(`${href}/`);
}

function TabIcon({ href }: { href: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true as const,
    className: "shrink-0",
  };

  if (href === "/scan") {
    return (
      <svg {...common}>
        <path
          d="M8 7h8l1 2h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2l1-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (href === "/batch") {
    return (
      <svg {...common}>
        <path
          d="M7 7h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8.5 11h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 14h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 17h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (href === "/inventory") {
    return (
      <svg {...common}>
        <path
          d="M7.5 4.5h9A2.5 2.5 0 0 1 19 7v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V7a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8.5 9h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 12.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 16h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M4.5 12a7.5 7.5 0 0 1 11.781-6.11L18 4.17l2.83 2.83-1.72 1.719A7.47 7.47 0 0 1 19.5 12a7.47 7.47 0 0 1-.39 3.281L20.83 17 18 19.83l-1.719-1.72A7.5 7.5 0 0 1 4.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppBottomTabs() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur"
    >
      <div className="mx-auto w-full max-w-md px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "h-12 rounded-2xl grid place-items-center text-[11px] font-semibold transition",
                  active ? "bg-accent text-white" : "text-muted hover:bg-surface2 active:bg-surface2",
                ].join(" ")}
              >
                <span className="flex flex-col items-center justify-center gap-1">
                  <TabIcon href={tab.href} />
                  <span>{tab.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
