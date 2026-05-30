import { describe, expect, it } from 'vitest'

import type { CardIdentity } from '../types'
import { buildInventoryLogRowValues } from './inventoryRow'

describe('buildInventoryLogRowValues', () => {
  it('builds a stable row', () => {
    const id: CardIdentity = {
      cardCode: 'OP01-016',
      cardName: 'Nami',
      setCode: null,
      rarity: null,
      variant: 'standard',
      language: 'unknown',
      confidence: 1,
      ambiguity: false
    }
    expect(
      buildInventoryLogRowValues({
        timestampIso: '2026-01-01T00:00:00.000Z',
        identity: id,
        delta: 1,
        reason: 'saved'
      })
    ).toEqual(['2026-01-01T00:00:00.000Z', 'OP01-016', 'Nami', 'standard', 1, 'saved', null, null, null, null])
  })
})
