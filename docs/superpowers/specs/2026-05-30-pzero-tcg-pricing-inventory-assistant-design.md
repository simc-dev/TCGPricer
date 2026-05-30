# CardScout (Agentic TCG Pricing & Inventory Assistant, SG) — Design

**Goal**
- Build a mobile-first PWA that lets a Singapore LGS scan a JP TCG card, pull multi-platform pricing, compute Buy/Sell suggestions, and append a row to Google Sheets with traceable notes.

**Target Users**
- LGS owners and counter staff handling trade-ins, buybacks, and inventory intake.

---

## 1) Scope (MVP)

### In Scope
- PWA camera capture → cloud VLM extraction of card identity (code + name + rarity + set) with confidence.
- Verification screen before saving (always shown).
- Pricing integrations:
  - Carousell SG via Apify (listing title + price + description) and LLM parsing to ignore bait listings and extract real price.
  - Mercari JP via Apify (sold/market comps).
  - PriceCharting via official API.
  - Yuyutei via scraping (Cloudflare risk accepted for MVP).
- Pricing engine with two modes:
  - Buy Mode: FX convert + buylist margin multiplier + rounding to nearest configurable increment.
  - Sell Mode: FX convert + condition discount (NM/LP/MP) + psychological rounding.
- Benchmark selection rules (single rule set used for both Buy/Sell).
- “Parallel vs Standard” ambiguity prompt when a card code maps to multiple rarities/variants.
- Manual approval gate before writing to Sheets.
- Google Sheets append integration with a minimal column schema and a required “Notes” explanation column.

### Out of Scope (MVP)
- Any autonomous updates to storefronts or public listings (Shopify/Carousell seller accounts).
- Full inventory management system (stock counts, reorder, reconciliation) beyond “append to sheet”.
- Multi-store / multi-tenant management UI (MVP targets one store instance).
- Advanced analytics dashboards.

---

## 2) Architecture (Option 1)

Single Next.js application:
- **Frontend:** Next.js PWA UI optimized for mobile camera use.
- **Backend:** Next.js API routes for calling OpenRouter, Apify, PriceCharting, Yuyutei scrape, FX, and Google Sheets.

**Secrets/config (runtime env)**
- `OPEN_ROUTER_API_KEY`
- Apify token (if used)
- PriceCharting API token
- Google Sheets service account credentials (or OAuth, TBD by implementation plan) stored as env/secret, never committed

---

## 3) Primary User Flows

### Flow A: Scan & Identify
1. User opens PWA and taps “Scan”.
2. User captures a photo of the card.
3. App uploads the image to backend `POST /api/vision/extract`.
4. Backend calls OpenRouter VLM (default: Qwen2.5-VL-72B) and returns:
   - `cardCode`, `cardName`, `setCode`, `rarity`, `language`
   - `confidence` (0–1)
   - `ambiguity`: whether multiple variants match the same card code
5. If ambiguous, UI shows “Standard or Parallel Art?” quick prompt.

### Flow B: Price Fetch & Suggest
1. Backend queries pricing sources in parallel:
   - Carousell (SG local)
   - Mercari (JP comps)
   - PriceCharting (stable API)
   - Yuyutei scrape (JP benchmark)
2. Backend normalizes prices into:
   - JPY for JP sources where applicable
   - SGD for Carousell
3. Backend computes benchmark price using rule-based blend (Section 5).
4. Frontend computes Buy/Sell suggestions (or backend computes; either is acceptable as long as logic is identical and tested).

### Flow C: Verify → Save to Sheet
1. Verification screen always displays:
   - Card identity fields + confidence
   - Raw platform prices + counts/recency (at least enough to support Notes)
   - Selected benchmark + explanation
   - Buy/Sell suggestion with inputs (FX rate, margin/condition)
2. User can:
   - Rescan
   - Edit card fields (code/name/rarity) if the scan is wrong
   - Toggle Buy/Sell
   - Tap condition (NM/LP/MP) in Sell mode
3. User taps “Save to Sheet”.
4. System checks manual approval gate (Section 6). If blocked, require explicit “Approve & Save”.
5. Backend appends a row to Google Sheet.

### Batch Mode (B)
- User can switch from A → B.
- In B, each scan still shows the verification screen immediately.
- After the operator confirms correctness, the entry is **auto-saved per scan**.
- If operator chooses “Rescan/Edit”, it replaces the pending entry before it’s saved.

---

## 4) Data Model (MVP)

### CardIdentity
- `cardCode: string` (e.g., OP07-119)
- `cardName: string`
- `setCode: string | null`
- `rarity: string | null`
- `variant: "standard" | "parallel" | null`
- `language: "ja" | "en" | "unknown"`
- `confidence: number` (0–1)

### PriceObservation
- `source: "carousell" | "mercari" | "pricecharting" | "yuyutei"`
- `currency: "SGD" | "JPY" | "USD"`
- `value: number`
- `count?: number` (e.g., number of listings)
- `newestTimestamp?: string` (ISO)
- `notes?: string` (e.g., “bait filtered”, “oos detected”)

### PricingDecision
- `benchmarkSource: "carousell" | "mercari" | "yuyutei" | "pricecharting"`
- `benchmarkValue: number`
- `benchmarkCurrency: "SGD" | "JPY" | "USD"`
- `benchmarkExplanation: string`

---

## 5) Benchmark Selection Rules (Same for Buy/Sell)

### Carousell as Primary (SG-local reality)
Use Carousell as the benchmark if:
- Clean comps (bait-filtered listings) **>= 3**, and
- Newest clean listing is within **30 days**

When Carousell is primary:
- Benchmark price = **median** of parsed clean listing prices (SGD).

### Mercari fallback
If Carousell rule is not met:
- Use Mercari JP benchmark from Apify result (sold/market comp).
- Benchmark currency = JPY.

### Yuyutei fallback (only if in-stock)
If Mercari is unavailable:
- Use Yuyutei only if in-stock.
- If out-of-stock or stale/unknown, do not use as benchmark.

### PriceCharting last resort
If none of the above are available:
- Use PriceCharting API.

---

## 6) Pricing Engine (Math)

### FX
- Use a central FX rate for JPY→SGD (`R_FX`).
- Cache FX rate for a short TTL to avoid repeated calls.

### Buy Mode
- Inputs:
  - `P_base` (benchmark price, normalized to SGD)
  - `M_buylist` (e.g., 0.6 / 0.7)
  - `Δ` rounding increment (0.50 or 1.00)
- Formula:
  - `P_buy_base = P_base * M_buylist`
  - `P_buy_final = round(P_buy_base, Δ)`

### Sell Mode
- Inputs:
  - `P_base` (benchmark price, normalized to SGD)
  - `D_condition` (NM=0, LP=0.10, MP=0.20)
  - Psychological pricing offset rules
- Formula:
  - `P_sell_base = P_base * (1 - D_condition)`
  - `P_sell_final = floor(P_sell_base) + Ψ` where `Ψ` is chosen to match local retail endings.

---

## 7) Manual Approval Gate (MGF + Safety)

Before writing to Google Sheets, require explicit approval if any is true:
- Suggested price (Buy or Sell depending on active mode) **> 100 SGD**, or
- OCR/VLM confidence **< 0.90**, or
- Variant ambiguity prompt (“standard vs parallel”) was shown

---

## 8) Google Sheets Row (Minimal Columns)

MVP columns (ordered):
- `Timestamp`
- `Card Code`
- `Name`
- `Set`
- `Rarity`
- `Mode` (Buy/Sell)
- `Condition` (NM/LP/MP or blank)
- `Benchmark Source`
- `Benchmark Price` (original currency)
- `FX Rate` (JPY→SGD if applicable)
- `Suggested SGD`
- `Notes` (must explain benchmark choice, bait filtering, OOS decisions, etc.)

---

## 9) Integrations (MVP)

### OpenRouter (Vision + Text parsing)
- Vision model: Qwen2.5-VL-72B (configurable).
- Text parsing model for bait listing extraction (configurable).

### Apify
- Mercari scraper actor
- Carousell scraper actor

### PriceCharting
- Official API, respect rate limits (1 rps).

### Yuyutei
- Scrape HTML for price and stock state.
- Treat “OOS/stale” as invalid benchmark source.

### Google Sheets
- Append-only writes to a single configured spreadsheet + sheet tab.

---

## 10) Non-Functional Requirements (MVP)

### Reliability
- Source failures are partial: app still works and shows available sources.
- Timeouts per integration; display “unavailable” with reason.

### Security
- No secrets in client code.
- No logging of API keys or credential material.

### Traceability
- Notes column always populated when saving.
- Store enough structured info server-side to generate Notes consistently.

---

## 11) API Surface (MVP)

- `POST /api/vision/extract`
  - Request: image (multipart/form-data) + optional hints (game, language)
  - Response: `CardIdentity`

- `POST /api/pricing/quote`
  - Request: `CardIdentity` + mode + condition + store settings (margin/rounding)
  - Response: `{ observations: PriceObservation[], decision: PricingDecision, suggested: { buy?: number, sell?: number } }`

- `POST /api/sheets/append`
  - Request: row payload with the minimal columns + a structured breakdown for Notes
  - Response: success + appended row id/range

---

## 12) Success Criteria (MVP Trial)
- Operator can scan a card and save a row to Sheets with one primary flow.
- System reduces manual lookup/time per card versus current Excel workflow.
- Notes reliably justify benchmark choice (especially Carousell bait filtering and Yuyutei OOS handling).
