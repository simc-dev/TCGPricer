# CardScout — Inventory, Settings, and Welcome Screens (MVP)

## Reader
Builder implementing the next MVP slice in the existing Next.js app.

## Goal
Add three user-facing capabilities:
- A 4-screen welcome/onboarding flow shown once per device.
- A Settings screen to toggle pricing sources (skip entirely when off) plus an Advanced section for pricing knobs.
- An Inventory feature that collects everything successfully saved, aggregates quantities, supports +/- adjustments, and writes an auditable inventory log to Google Sheets when available.

## Non-Goals (for this MVP)
- Cross-device inventory sync without Google Sheets credentials.
- Server-side database.
- Inventory reconciliation workflows (full stocktake UI, barcode, exports).
- Per-mode (Buy vs Sell) source toggles.

## Decisions Locked
- Navigation: bottom tabs (Scan · Batch · Inventory · Settings).
- Welcome flow: 4 screens.
- Inventory quantity: auto +1 only after Save succeeds.
- Inventory aggregation key: cardCode + variant.
- Storage: local + Google Sheets.
- Sheets representation: Inventory Log tab + Inventory Aggregate tab computed from the log.
- Inventory management: allow +/- adjustments in item detail, logged to Inventory Log (+1/-1 entries).
- Pricing source toggles: skip entirely when off.

---

## 1) Navigation

### Bottom Tabs
Add a persistent bottom tab bar across app pages:
- Scan (`/scan`)
- Batch (`/batch`)
- Inventory (`/inventory`)
- Settings (`/settings`)

Behavior:
- The active tab is visually highlighted.
- Tabs are safe-area aware (bottom padding on devices with gesture bars).
- Navigation does not clear in-progress local UI state unless the user navigates away explicitly.

---

## 2) Welcome / Onboarding (4 screens)

### When Shown
- Shown once per device/browser install.
- Can be skipped at any time.
- After completion/skip, route to Scan.

### Copy (4 screens)
1) Scan → Sheet in seconds  
   Take a photo, confirm the identity, and save a clean row with notes.

2) SG-first benchmark, bait filtered  
   Prefers local relevance and ignores “bait” listings where possible.

3) Buy/Sell suggestions + approval gating  
   Computes shop-friendly prices and flags high-risk quotes.

4) Inventory builds automatically  
   Each successful save increments inventory so you can track intake.

### UX Requirements
- Swipeable pages with dots indicator and Next button.
- Skip button always available.
- Persist completion flag locally.

---

## 3) Settings

### 3.1 Pricing Sources (Global)
Toggles for pricing sources:
- Carousell
- Mercari JP
- Yuyutei
- PriceCharting

Behavior:
- When toggled off, the source is skipped entirely:
  - No fetch is performed.
  - It does not appear in observations returned by pricing.
  - It is not used for benchmark selection.

### 3.2 Advanced Pricing (Global)
Expose a minimal set of knobs with sane defaults:
- Buylist multiplier (default 0.70)
- Buy rounding (0.50 or 1.00)
- Condition discounts:
  - NM: 0%
  - LP: 10%
  - MP: 20%
- Psychological rounding preset (simple selector):
  - Off
  - Conservative (round to nearest 0.50)
  - Retail (round to nearest 1.00)

Persistence:
- Settings stored locally per device.

Application:
- Settings are included in the quote request so backend pricing logic matches the UI.

---

## 4) Inventory

### 4.1 Aggregation Key
Inventory items are aggregated by:
- `cardCode + variant`

Variant is treated as a stable discriminator for quantity aggregation.

### 4.2 Local Inventory Model
Local inventory is the fast, offline-first source used for rendering Inventory UI.

Per item:
- key: `cardCode::variant`
- identity summary:
  - cardCode
  - cardName (best-known)
  - rarity (best-known, optional)
  - variant (standard/parallel/empty)
- quantityTotal (integer)
- lastSeenAtIso
- lastQuoteSummary:
  - mode
  - condition (if sell)
  - suggestedSgd
  - benchmarkSource
  - notes (short string)

Local history:
- Keep a capped list of recent events (e.g., last 50):
  - eventType: saved | adjust
  - delta: +1 | -1 | other small integer
  - occurredAtIso
  - optional: suggestedSgd, benchmarkSource

### 4.3 Inventory Screen (Recent-first)
Default inventory view:
- Search field (code/name substring match)
- Recent-first list of items
- Each row shows:
  - cardName
  - cardCode · variant (if any)
  - quantityTotal (×N)

Tap item → detail screen.

### 4.4 Inventory Item Detail (+/-)
Detail screen capabilities:
- Display identity summary and quantityTotal
- Show recent event history (last N entries)
- Buttons:
  - +1
  - -1

Constraints:
- QuantityTotal cannot go below 0.

### 4.5 When Inventory Changes
Inventory only increments (auto +1) after Save succeeds.

Save succeeds means:
- The main pricing row append succeeds (existing Save to Sheet behavior).
- If Sheets integration is in mock mode, “success” is the mock append success.

---

## 5) Google Sheets Inventory

### 5.1 Inventory Log (Append-only)
Write one row per inventory change:
- timestamp (ISO)
- cardCode
- cardName (best-known at time of event)
- variant
- delta (+1 / -1)
- reason (saved / adjust)
- optional pricing snapshot:
  - mode
  - condition
  - suggestedSgd
  - benchmarkSource

### 5.2 Inventory Aggregate (Computed)
Inventory Aggregate is computed in Sheets (pivot/formulas) from Inventory Log.
The app does not update aggregated rows in-place for this MVP.

---

## 6) Data Flow Changes

### 6.1 Quote Requests
Quote request includes Settings:
- enabledSources
- advanced inputs

Backend uses enabledSources to decide which fetchers to run and which observations to return.

### 6.2 Save Flow
On “Save to Sheet”:
1) Append pricing row (existing).
2) If step 1 succeeds:
   - Update local inventory: +1 for cardCode+variant.
   - Append Inventory Log row (if Sheets available; otherwise mock-log).

Error behavior:
- If pricing save fails: do not increment inventory.
- If inventory log append fails after pricing save succeeded:
  - Inventory still increments locally.
  - UI shows an error that inventory log sync failed (non-blocking).

---

## 7) Testing / Verification
- Unit tests for:
  - settings serialization/deserialization (defaults and validation)
  - inventory aggregation (keying, +1, -1, non-negative)
  - inventory log row builder for Sheets
- Basic UI smoke tests (component render) where existing test patterns support it.

---

## 8) Future Work
- Import/export inventory to/from Sheets (read path).
- Multi-device sync (Sheets read + merge or a database).
- Per-game filters and richer grouping.
- Batch adjustments and stocktake mode.
