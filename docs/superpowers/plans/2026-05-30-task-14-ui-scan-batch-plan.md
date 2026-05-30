# Task 14 UI (Scan + Verify + Batch Stub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished mobile-first `/scan` flow that captures a photo, calls `/api/vision/extract` then `/api/pricing/quote`, and renders a verification UI (Buy/Sell toggle, Sell-only condition selector, rescan, manual approval indicator). Add a `/batch` stub page and update the home page to link to both.

**Architecture:** `/scan` is a Client Component page that owns state machine (capture → extracting → quoting → verify). UI is decomposed into small Client Components styled with Tailwind.

**Tech Stack:** Next.js App Router, React Client Components, Tailwind CSS v4.

---

## File Structure

**Create**
- `src/app/scan/page.tsx` — scan flow page
- `src/app/batch/page.tsx` — placeholder page
- `src/components/ScanCapture.tsx` — file input + preview surface
- `src/components/ModeToggle.tsx` — segmented Buy/Sell toggle
- `src/components/ConditionToggle.tsx` — NM/LP/MP toggle (Sell only)
- `src/components/ApprovalGate.tsx` — manual approval badge
- `src/components/VerifyCard.tsx` — verification card UI composition

**Modify**
- `src/app/page.tsx` — landing page links

---

## Task A: Shared UI components

- [ ] **Step 1: Create ScanCapture**
  - Accept `onFile(file)` and optional `previewUrl`
  - Use `capture="environment"`, `accept="image/*"`
  - Provide large primary CTA, plus optional thumbnail preview

- [ ] **Step 2: Create ModeToggle**
  - Props: `value: PricingMode`, `onChange`
  - Tailwind segmented control style with active state

- [ ] **Step 3: Create ConditionToggle**
  - Props: `value: Condition`, `onChange`
  - Tailwind pill buttons

- [ ] **Step 4: Create ApprovalGate**
  - Props: `required: boolean`, `reasons: string[]`
  - Render a red badge (and optional reasons list)

- [ ] **Step 5: Create VerifyCard**
  - Takes `identity`, `quote`, `mode`, `condition`
  - Buy/Sell toggle always visible
  - Condition selector rendered only when `mode === "sell"`
  - Show suggested price (mode-dependent), benchmark source, and notes
  - Provide `Rescan` button callback

---

## Task B: `/scan` page wiring

- [ ] **Step 1: Implement client-side state machine**
  - `stage: "capture" | "extracting" | "verifying"`
  - Store `file`, `previewUrl`, `identity`, `quote`, `mode`, `condition`, `error`

- [ ] **Step 2: Implement extract call**
  - POST FormData with `image` to `/api/vision/extract`
  - On success, set `identity` and transition to verify

- [ ] **Step 3: Implement quote call**
  - When `identity` is set, call `/api/pricing/quote` with:
    - `mode`
    - `condition: mode === "sell" ? condition : null`
    - `inputs: { buylistMultiplier: 0.7, buyRounding: 0.5, condition: null }`
  - Re-run quote when mode/condition changes

- [ ] **Step 4: Implement rescan**
  - Clear all state and return to capture

---

## Task C: `/batch` stub + home page links

- [ ] **Step 1: Create `/batch` stub**
  - Minimal layout, “Coming soon”, link back to `/scan`

- [ ] **Step 2: Update home page**
  - Replace scaffold template with a simple landing
  - Use Next `<Link>` to `/scan` and `/batch`

---

## Verification

- [ ] Run:

```powershell
npm run build
```

Expected: build succeeds with no TypeScript errors.

