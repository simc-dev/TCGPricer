import type { AppSettings, SellRoundingPreset } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEY = 'cardscout:settings:v1'
const LEGACY_KEY = 'tcgpricer:settings:v1'

function isSellPreset(v: unknown): v is SellRoundingPreset {
  return v === 'off' || v === 'conservative' || v === 'retail'
}

function getLocalStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
} | null {
  if (typeof window === 'undefined') return null
  const ls = (window as unknown as { localStorage?: unknown }).localStorage
  const v = ls as { getItem?: unknown; setItem?: unknown } | null
  if (!v) return null
  if (typeof v.getItem !== 'function') return null
  if (typeof v.setItem !== 'function') return null
  const getItem = v.getItem.bind(v) as (key: string) => string | null
  const setItem = v.setItem.bind(v) as (key: string, value: string) => void
  return { getItem, setItem }
}

export function loadSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as unknown
    const v = parsed as Record<string, unknown> | null
    const src = (v?.sources ?? {}) as Record<string, unknown>
    const adv = (v?.advanced ?? {}) as Record<string, unknown>
    const discounts = (adv.conditionDiscounts ?? {}) as Record<string, unknown>

    return {
      sources: {
        carousell: src.carousell !== false,
        mercari: src.mercari !== false,
        pricecharting: src.pricecharting !== false,
        yuyutei: src.yuyutei !== false
      },
      advanced: {
        buylistMultiplier:
          typeof adv.buylistMultiplier === 'number' && Number.isFinite(adv.buylistMultiplier)
            ? adv.buylistMultiplier
            : DEFAULT_SETTINGS.advanced.buylistMultiplier,
        buyRounding: adv.buyRounding === 1 ? 1 : 0.5,
        conditionDiscounts: {
          nm:
            typeof discounts.nm === 'number' && Number.isFinite(discounts.nm)
              ? discounts.nm
              : DEFAULT_SETTINGS.advanced.conditionDiscounts.nm,
          lp:
            typeof discounts.lp === 'number' && Number.isFinite(discounts.lp)
              ? discounts.lp
              : DEFAULT_SETTINGS.advanced.conditionDiscounts.lp,
          mp:
            typeof discounts.mp === 'number' && Number.isFinite(discounts.mp)
              ? discounts.mp
              : DEFAULT_SETTINGS.advanced.conditionDiscounts.mp
        },
        sellRoundingPreset: isSellPreset(adv.sellRoundingPreset)
          ? adv.sellRoundingPreset
          : DEFAULT_SETTINGS.advanced.sellRoundingPreset
      }
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getStoredSettings(): AppSettings {
  const ls = getLocalStorage()
  if (!ls) return DEFAULT_SETTINGS
  const raw = ls.getItem(KEY)
  if (raw) return loadSettings(raw)

  const legacy = ls.getItem(LEGACY_KEY)
  if (!legacy) return DEFAULT_SETTINGS

  const migrated = loadSettings(legacy)
  if (migrated !== DEFAULT_SETTINGS) ls.setItem(KEY, JSON.stringify(migrated))
  return migrated
}

export function setStoredSettings(next: AppSettings): void {
  const ls = getLocalStorage()
  if (!ls) return
  ls.setItem(KEY, JSON.stringify(next))
}
