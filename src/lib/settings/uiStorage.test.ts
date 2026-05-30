import { beforeEach, describe, expect, it } from 'vitest'

import { getPricingUiMode, setPricingUiMode } from './uiStorage'

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

describe('uiStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true })
  })

  it('defaults to simple', () => {
    expect(getPricingUiMode()).toBe('simple')
  })

  it('returns simple if localStorage is unavailable', () => {
    const original = window.localStorage
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true })
    expect(getPricingUiMode()).toBe('simple')
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true })
  })

  it('returns simple for invalid JSON (new key)', () => {
    window.localStorage.setItem('cardscout:settings-ui:v1', '{not json')
    expect(getPricingUiMode()).toBe('simple')
  })

  it('roundtrips expert mode', () => {
    setPricingUiMode('expert')
    expect(getPricingUiMode()).toBe('expert')
  })

  it('returns simple for invalid legacy JSON', () => {
    window.localStorage.setItem('tcgpricer:settings-ui:v1', '{not json')
    expect(getPricingUiMode()).toBe('simple')
  })

  it('guards invalid legacy values', () => {
    window.localStorage.setItem('tcgpricer:settings-ui:v1', JSON.stringify({ pricingMode: 'lol' }))
    expect(getPricingUiMode()).toBe('simple')
  })
})
