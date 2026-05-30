const KEY = 'cardscout:settings-ui:v1'
const LEGACY_KEY = 'tcgpricer:settings-ui:v1'

export type PricingUiMode = 'simple' | 'expert'

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

export function getPricingUiMode(): PricingUiMode {
  const ls = getLocalStorage()
  if (!ls) return 'simple'
  const raw = ls.getItem(KEY)
  if (raw) {
    try {
      const v = JSON.parse(raw) as unknown
      const m = (v as { pricingMode?: unknown } | null)?.pricingMode
      return m === 'expert' ? 'expert' : 'simple'
    } catch {
      return 'simple'
    }
  }

  const legacy = ls.getItem(LEGACY_KEY)
  if (!legacy) return 'simple'
  try {
    const v = JSON.parse(legacy) as unknown
    const m = (v as { pricingMode?: unknown } | null)?.pricingMode
    ls.setItem(KEY, JSON.stringify({ pricingMode: m === 'expert' ? 'expert' : 'simple' }))
    return m === 'expert' ? 'expert' : 'simple'
  } catch {
    return 'simple'
  }
}

export function setPricingUiMode(mode: PricingUiMode): void {
  const ls = getLocalStorage()
  if (!ls) return
  ls.setItem(KEY, JSON.stringify({ pricingMode: mode }))
}
