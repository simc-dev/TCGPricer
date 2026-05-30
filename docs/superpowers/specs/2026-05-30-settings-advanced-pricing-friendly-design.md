# Friendlier Advanced Pricing (Settings → Advanced)

## Summary

Settings currently exposes pricing mechanics in a way that reads like internal math knobs and acronyms. This change makes “Advanced pricing” understandable for most users by default while preserving full control for power users.

Primary change: a “Pricing style” section with three plain-language presets and one simple “Profit ↔ Volume” slider that jointly adjusts buy + sell behavior. Existing controls remain available under an “Expert settings” disclosure.

## Goals

- Reduce cognitive load in Settings → Advanced by removing acronyms and “math-first” language from the default view.
- Provide a single, understandable control that captures the common intent: “pay less / pay more” and “sell faster / sell higher”.
- Preserve the existing pricing behavior and existing stored settings schema.
- Keep the old controls accessible (expert mode) without forcing them on everyone.
- Remember the user’s last view (Simple vs Expert) on this device.

## Non-goals

- Changing the pricing engine behavior beyond what is already configurable by the existing advanced settings inputs.
- Changing backend APIs or server-side pricing logic.
- Introducing user accounts / syncing settings across devices.

## Current State (Reference)

The Advanced section currently exposes:

- Buylist multiplier
- Buy rounding ($0.50 / $1.00)
- Sell condition discounts (NM/LP/MP)
- Sell rounding preset (Off/Conservative/Retail)

## Proposed UX

### Simple mode (default)

1. **Pricing style presets**
   - Margin
   - Balance
   - Volume

2. **Profit ↔ Volume slider**
   - A single slider that adjusts the same underlying advanced settings in a bundled way.
   - Shows a live “What this means” summary with:
     - Suggested buy: “~X% of benchmark”
     - Buy rounding: “$0.50” or “$1.00”
     - Sell condition adjustments: Near mint / Light play / Moderate play
     - Sell rounding: “Off / $0.50 / $1.00” phrased plainly

3. **Expert settings disclosure**
   - Collapsed by default in Simple mode.
   - When expanded, shows the existing controls, but rewritten with plain labels and expanded condition names.

### Expert mode (optional)

- Shows the expert controls expanded.
- Still shows the presets and the summary for orientation, but the expert inputs take precedence when edited directly.

### Remembering view

- Persist a UI-only toggle (Simple vs Expert) in localStorage.
- It affects only Settings display (not the quote request payload).

## Copy / Label Changes (Expert controls)

- “Buylist multiplier” → “How much you pay (vs benchmark)”
- “Buy rounding” → “Round buy suggestions”
- “Sell condition discounts” → “Adjust sell by condition”
  - NM → Near mint
  - LP → Light play
  - MP → Moderate play
- “Sell rounding preset” → “Round sell prices”
  - Retail → Round to $1
  - Conservative → Round to $0.50
  - Off → Keep decimals

## Mapping: Slider/Presets → Existing Stored Settings

The underlying stored settings remain:

- `advanced.buylistMultiplier` (number)
- `advanced.buyRounding` (0.5 | 1)
- `advanced.conditionDiscounts` (nm/lp/mp decimal percentages)
- `advanced.sellRoundingPreset` ('off' | 'conservative' | 'retail')

### Preset anchors (v1)

Balance is the baseline anchor and reflects user preference for ~65% buy vs benchmark.

- **Margin**
  - buylistMultiplier: 0.55
  - buyRounding: 1
  - conditionDiscounts: { nm: 0.00, lp: 0.05, mp: 0.10 }
  - sellRoundingPreset: 'retail'

- **Balance**
  - buylistMultiplier: 0.65
  - buyRounding: 0.5
  - conditionDiscounts: { nm: 0.00, lp: 0.10, mp: 0.20 }
  - sellRoundingPreset: 'retail'

- **Volume**
  - buylistMultiplier: 0.75
  - buyRounding: 0.5
  - conditionDiscounts: { nm: 0.00, lp: 0.15, mp: 0.25 }
  - sellRoundingPreset: 'conservative'

### Slider behavior

The slider represents a continuous value `t` in [0..1] where:

- t = 0 corresponds to Margin
- t = 0.5 corresponds to Balance
- t = 1 corresponds to Volume

Mapping rules:

- buylistMultiplier interpolates linearly between anchors.
- conditionDiscounts interpolate linearly per field between anchors.
- buyRounding is 1 for low t and 0.5 for higher t with a threshold near t≈0.33 (kept simple).
- sellRoundingPreset is 'retail' for lower t and 'conservative' for higher t with a threshold near t≈0.66.

If a user directly edits expert values, Simple slider/preset selection updates to the nearest matching profile by distance (best-effort).

## Data Model / Persistence

- Pricing settings continue to save under the existing settings key and shape.
- Add a new localStorage key for Settings UI view state, e.g.:
  - `tcgpricer:settings-ui:v1` → `{ pricingMode: 'simple' | 'expert' }`

## Acceptance Criteria

- Default Advanced view shows presets (Margin/Balance/Volume), one slider, and a clear summary.
- Acronyms NM/LP/MP are not shown in Simple mode.
- Expert disclosure reveals the existing controls with renamed labels and expanded condition names.
- Saving settings persists the underlying existing advanced settings shape; Scan + Batch behavior remains compatible.
- Switching between Simple/Expert is remembered on the device.

## Risks / Edge Cases

- Users may have existing non-anchor values; Simple mode should still work:
  - compute nearest preset for display, but do not overwrite until the user changes slider/preset.
- Interpolation must clamp to safe ranges.

