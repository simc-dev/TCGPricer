import { describe, expect, it } from 'vitest'

import type { InventoryItem, InventoryState } from './types'
import { computeInventoryKpis } from './kpis'

function makeItem(partial: Partial<InventoryItem> & Pick<InventoryItem, 'key'>): InventoryItem {
  return {
    key: partial.key,
    cardCode: partial.cardCode ?? 'CODE',
    variant: partial.variant ?? null,
    cardName: partial.cardName ?? 'Name',
    rarity: partial.rarity ?? null,
    quantityTotal: partial.quantityTotal ?? 0,
    lastSeenAtIso: partial.lastSeenAtIso ?? '2026-01-01T00:00:00.000Z',
    events: partial.events ?? []
  }
}

describe('computeInventoryKpis', () => {
  it('returns zeros for empty state', () => {
    const kpis = computeInventoryKpis({ items: {} })
    expect(kpis).toEqual({
      uniqueCount: 0,
      totalQuantity: 0,
      estimatedValueSgd: 0
    })
  })

  it('computes totals and estimated value from latest suggested event', () => {
    const state: InventoryState = {
      items: {
        a: makeItem({
          key: 'a',
          quantityTotal: 2,
          lastSeenAtIso: '2026-01-01T00:00:00.000Z',
          events: [
            {
              occurredAtIso: '2026-01-01T00:00:00.000Z',
              delta: 2,
              reason: 'saved',
              suggestedSgd: 10
            }
          ]
        }),
        b: makeItem({
          key: 'b',
          quantityTotal: 0,
          lastSeenAtIso: '2026-02-01T00:00:00.000Z',
          events: [
            {
              occurredAtIso: '2026-02-01T00:00:00.000Z',
              delta: -1,
              reason: 'adjust'
            }
          ]
        }),
        c: makeItem({
          key: 'c',
          quantityTotal: 3,
          lastSeenAtIso: '2026-03-01T00:00:00.000Z',
          events: [
            {
              occurredAtIso: '2026-03-01T00:00:01.000Z',
              delta: 0,
              reason: 'adjust',
              suggestedSgd: null
            },
            {
              occurredAtIso: '2026-03-01T00:00:00.000Z',
              delta: 3,
              reason: 'saved',
              suggestedSgd: 5.5
            }
          ]
        })
      }
    }

    const kpis = computeInventoryKpis(state)
    expect(kpis.uniqueCount).toBe(3)
    expect(kpis.totalQuantity).toBe(5)
    expect(kpis.estimatedValueSgd).toBe(37)
  })
})
