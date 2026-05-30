# Dashboard + Upload Navigation Redesign

## Summary
Replace the current Scan and Batch top-level screens with a single **Upload** screen, and introduce a new **Dashboard** screen as the landing + primary hub for most users.

## Goals
- Make **Dashboard** the default entry point for returning users.
- Reduce navigation complexity by merging **Scan** + **Batch** into **Upload**.
- Preserve the existing intake flows (single-card “scan” and batch intake) with minimal regressions.
- Keep navigation consistent with the existing mobile-first shell (sticky headers + bottom tabs).

## Non-goals
- Reworking pricing logic, benchmark selection, or approval gating.
- Changing data persistence strategy (local inventory tracking + Sheets sync).
- Redesigning Inventory/Settings beyond updating entry points and labels.

## Information Architecture

### Primary tabs (bottom navigation)
- **Dashboard** (`/`)
- **Upload** (`/upload`)
- **Inventory** (`/inventory`)
- **Settings** (`/settings`)

### Backward-compatible legacy routes
- `/scan` → redirect to `/upload?mode=single`
- `/batch` → redirect to `/upload?mode=batch`

## Dashboard (Landing Screen)

### Purpose
A quick overview for “where things stand” without forcing an immediate next action. The Dashboard should still make it easy to jump into Upload for intake, but its primary job is to summarize state.

### Recommended layout blocks
- **Inventory snapshot**
  - Total items tracked
  - New items added (today and/or last 7 days)
  - Optional: estimated inventory value (if a stable estimate exists)
- **Needs attention**
  - Count of items requiring manual approval / review
  - Count of failed lookups / unresolved identity / variant ambiguity
  - Count of sync issues (if any)
- **Sync / system status**
  - Last successful sync time
  - Pending queue size (if applicable)
  - Any error banner state (tap to view details)
- **Recent activity**
  - Recent uploads
  - Recent approvals/edits
  - Recent sync events

### Navigation elements
- Keep the standard sticky header pattern used by other screens.
- Include a visible “Upload” affordance (button or prominent link) to reduce friction.

## Upload (Merged Scan + Batch)

### Purpose
One place to intake new cards, supporting two modes:
- **Single** (former Scan): take 1 photo → verify identity → save
- **Batch** (former Batch): capture multiple → verify each → save (with the existing per-item confirmation behavior)

### UI approach (recommended)
Single route `/upload` with an in-page mode switch:
- A segmented control with **Single** / **Batch** in the sticky header area.
- URL-driven mode via query param:
  - `/upload?mode=single`
  - `/upload?mode=batch`

This keeps the bottom tabs stable while still letting deep links (and legacy redirects) open the correct mode.

### Functional expectations
- **Single mode**
  - After capture, user verifies identity and pricing, then can save.
- **Batch mode**
  - Capture can be repeated to enqueue multiple items.
  - Users can move through queued items and verify/save per item.
  - Preserve the current “verify per scan, auto-save after confirm” behavior as implemented today.

## Copy / Naming
- Replace the words “Scan” and “Batch” in primary navigation with “Upload”.
- Keep “Single” and “Batch” labels inside the Upload screen as the mode names.
- Update any onboarding or empty-state copy that sends users to Scan/Batch.

## Migration + Risk Controls

### Redirects
- Implement redirect behavior for `/scan` and `/batch` so existing links and onboarding flows continue working.
- Update the onboarding “Get started/Skip” route target to `/upload?mode=single` (or `/upload` if single is the default).

### Update inbound links
- Home/landing links (if any remain) should route to `/upload`.
- Inventory empty state CTAs should route to `/upload` (and optionally preselect mode).

## Acceptance Criteria
- Visiting `/` shows Dashboard.
- Bottom tabs show Dashboard / Upload / Inventory / Settings.
- Visiting `/scan` and `/batch` routes the user into Upload with the correct mode selected.
- Onboarding exit routes to Upload (not Scan).
- No in-app links point to `/scan` or `/batch` after migration (except redirects).
