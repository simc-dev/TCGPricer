# Inventory Top KPIs (Quick Numbers) — Design

## Goal
Add a small “at a glance” summary at the top of the Inventory screen so staff can quickly understand the size of the collection without scrolling.

## Chosen UI
**Compact pills** (single-row / wrap-on-small) showing 3 numbers:
1. **Unique** — number of distinct inventory items
2. **Total qty** — sum of quantities across all items
3. **Est. value** — approximate SGD value based on the most recent saved benchmark per item

## Placement
- Inventory list page (`/inventory`) above search + list.
- Mobile-first layout; pills wrap to 2 lines on narrow screens.

## Data Definitions
### Unique
- `Object.keys(state.items).length`

### Total qty
- `sum(state.items[key].quantityTotal)`

### Est. value (SGD)
- For each item, find the most recent event that has `suggestedSgd` (events are already kept newest-first in UI, but stored order should be treated as append order).
- Per-item estimate: `quantityTotal * latestSuggestedSgd`
- Total estimate: sum of per-item estimates
- Display as whole SGD with thousands separators (no cents).

If an item has no event with `suggestedSgd`, it contributes `0` to the estimate.

## States
- **Empty inventory**: pills show `0`, and Est. value shows `$0`.
- **Partially valued**: Est. value reflects only valued items (no warning; keep it lightweight).

## Visual Notes (Design System Alignment)
- Use the existing warm “paper” + bordered surface look.
- Numbers should use tabular/mono styling where available (Geist Mono per DESIGN.md), but remain consistent with existing page typography.

## Non-Goals
- No filtering by time window (e.g., “last 30 days”) for this first version.
- No charts, trends, or category breakdowns.
- No server-side persistence changes (inventory remains localStorage-backed).

