"use client";

import type { ReactNode } from "react";

import { AppBottomTabs } from "@/components/AppBottomTabs";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

export function AppShell(props: { children: ReactNode; top?: ReactNode }) {
  return (
    <div className="flex-1 min-h-full flex flex-col">
      {props.top ? <div className="px-4 pt-[max(16px,env(safe-area-inset-top))]">{props.top}</div> : null}
      <div className="flex-1 flex flex-col pb-[calc(84px+env(safe-area-inset-bottom))]">{props.children}</div>
      <AppBottomTabs />
      <OnboardingOverlay />
    </div>
  );
}
