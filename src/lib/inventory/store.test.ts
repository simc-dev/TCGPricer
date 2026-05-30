import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CardIdentity } from '../types'
import { applyInventoryDelta, getStoredInventory, inventoryKeyOf, loadInventory, makeDemoInventoryState, setStoredInventory } from './store'

const baseIdentity: CardIdentity = {
  cardCode: 'OP01-016',
  cardName: 'Nami',
  setCode: null,
  rarity: null,
  variant: 'standard',
  language: 'unknown',
  confidence: 1,
  ambiguity: false
}

describe('inventoryKeyOf', () => {
  it('keys by code + variant', () => {
    expect(inventoryKeyOf(baseIdentity)).toBe('OP01-016::standard')
  })

  it('normalizes null variant into an empty segment', () => {
    expect(inventoryKeyOf({ ...baseIdentity, variant: null })).toBe('OP01-016::')
  })
})

describe('loadInventory', () => {
  it('returns empty state for null', () => {
    expect(loadInventory(null)).toEqual({ items: {} })
  })

  it('returns empty state for invalid JSON', () => {
    expect(loadInventory('{')).toEqual({ items: {} })
  })

  it('guards missing items', () => {
    expect(loadInventory(JSON.stringify({ nope: true }))).toEqual({ items: {} })
  })
})

describe('applyInventoryDelta', () => {
  it('increments and never goes below 0', () => {
    const s1 = applyInventoryDelta({
      state: { items: {} },
      identity: baseIdentity,
      delta: 1,
      reason: 'saved',
      occurredAtIso: '2026-01-01T00:00:00.000Z'
    })
    expect(s1.items['OP01-016::standard'].quantityTotal).toBe(1)

    const s2 = applyInventoryDelta({
      state: s1,
      identity: baseIdentity,
      delta: -5,
      reason: 'adjust',
      occurredAtIso: '2026-01-01T00:00:01.000Z'
    })
    expect(s2.items['OP01-016::standard'].quantityTotal).toBe(0)
  })

  it('caps events at MAX_EVENTS and prepends newest first', () => {
    let state = { items: {} }
    for (let i = 0; i < 60; i++) {
      state = applyInventoryDelta({
        state,
        identity: baseIdentity,
        delta: 1,
        reason: 'saved',
        occurredAtIso: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`
      })
    }
    const item = state.items['OP01-016::standard']
    expect(item.events).toHaveLength(50)
    expect(item.events[0].occurredAtIso).toBe('2026-01-01T00:00:59.000Z')
  })
})

describe('storage', () => {
  const mem: Record<string, string | null> = {}

  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k]
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => (key in mem ? mem[key] : null)),
        setItem: vi.fn((key: string, value: string) => {
          mem[key] = value
        })
      },
      configurable: true
    })
  })

  it('roundtrips through localStorage', () => {
    const state = applyInventoryDelta({
      state: { items: {} },
      identity: baseIdentity,
      delta: 1,
      reason: 'saved',
      occurredAtIso: '2026-01-01T00:00:00.000Z'
    })
    setStoredInventory(state)
    expect(getStoredInventory()).toEqual(state)
  })

  it('returns a stable snapshot when storage has not changed', () => {
    const state = applyInventoryDelta({
      state: { items: {} },
      identity: baseIdentity,
      delta: 1,
      reason: 'saved',
      occurredAtIso: '2026-01-01T00:00:00.000Z'
    })
    setStoredInventory(state)
    const s1 = getStoredInventory()
    const s2 = getStoredInventory()
    expect(s2).toBe(s1)
  })
})

describe('makeDemoInventoryState', () => {
  it('returns a non-empty state', () => {
    const s = makeDemoInventoryState('2026-01-01T00:00:00.000Z')
    expect(Object.keys(s.items).length).toBeGreaterThan(0)
  })
})
