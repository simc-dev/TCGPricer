import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from './types'
import { getStoredSettings, loadSettings, setStoredSettings } from './storage'

function createMemoryStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
} {
  const store = new Map<string, string>()
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    }
  }
}

describe('loadSettings', () => {
  it('returns defaults for null', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial settings', () => {
    const v = loadSettings(JSON.stringify({ sources: { mercari: false }, advanced: { buyRounding: 1 } }))
    expect(v.sources.mercari).toBe(false)
    expect(v.sources.carousell).toBe(true)
    expect(v.advanced.buyRounding).toBe(1)
  })

  it('guards invalid values', () => {
    const v = loadSettings(JSON.stringify({ advanced: { buyRounding: 123, sellRoundingPreset: 'lol' } }))
    expect(v.advanced.buyRounding).toBe(0.5)
    expect(v.advanced.sellRoundingPreset).toBe(DEFAULT_SETTINGS.advanced.sellRoundingPreset)
  })
})

describe('stored settings', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true })
  })

  it('roundtrips through localStorage', () => {
    const next = { ...DEFAULT_SETTINGS, sources: { ...DEFAULT_SETTINGS.sources, yuyutei: false } }
    setStoredSettings(next)
    expect(getStoredSettings()).toEqual(next)
  })

  it('returns defaults for invalid JSON', () => {
    window.localStorage.setItem('tcgpricer:settings:v1', '{not json')
    expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
