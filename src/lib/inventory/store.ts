import type { CardIdentity, Condition, PricingDecision, PricingMode } from '../types'
import type { InventoryEvent, InventoryKey, InventoryState } from './types'

const KEY = 'cardscout:inventory:v1'
const LEGACY_KEY = 'tcgpricer:inventory:v1'
const MAX_EVENTS = 50
const CHANGE_EVENT = 'cardscout:inventory:change'

export const EMPTY_INVENTORY: InventoryState = Object.freeze({ items: Object.freeze({}) }) as InventoryState

let cachedRaw: string | null = null
let cachedState: InventoryState = EMPTY_INVENTORY

export function inventoryKeyOf(identity: CardIdentity): InventoryKey {
  const v = identity.variant ?? ''
  return `${identity.cardCode}::${v}`
}

export function loadInventory(raw: string | null): InventoryState {
  if (!raw) return EMPTY_INVENTORY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return EMPTY_INVENTORY
    if (!('items' in parsed)) return EMPTY_INVENTORY
    const items = (parsed as { items?: unknown }).items
    if (!items || typeof items !== 'object') return EMPTY_INVENTORY
    return { items: items as InventoryState['items'] }
  } catch {
    return EMPTY_INVENTORY
  }
}

export function getStoredInventory(): InventoryState {
  if (typeof window === 'undefined') return EMPTY_INVENTORY
  const raw = window.localStorage.getItem(KEY)
  if (raw) {
    if (raw === cachedRaw) return cachedState
    cachedRaw = raw
    cachedState = loadInventory(raw)
    return cachedState
  }

  const legacy = window.localStorage.getItem(LEGACY_KEY)
  if (!legacy) return EMPTY_INVENTORY

  if (legacy === cachedRaw) return cachedState

  const migrated = loadInventory(legacy)
  const nextRaw = JSON.stringify(migrated)
  window.localStorage.setItem(KEY, nextRaw)
  cachedRaw = nextRaw
  cachedState = migrated
  return migrated
}

export function setStoredInventory(next: InventoryState) {
  if (typeof window === 'undefined') return
  const raw = JSON.stringify(next)
  window.localStorage.setItem(KEY, raw)
  cachedRaw = raw
  cachedState = next
  notifyStoredInventoryChanged()
}

export function notifyStoredInventoryChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeStoredInventory(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onCustom = () => callback()
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return
    if (!e.key.startsWith('cardscout:inventory:') && !e.key.startsWith('tcgpricer:inventory:')) return
    callback()
  }

  window.addEventListener(CHANGE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}

export function applyInventoryDelta(input: {
  state: InventoryState
  identity: CardIdentity
  delta: number
  reason: InventoryEvent['reason']
  occurredAtIso: string
  mode?: PricingMode
  condition?: Condition | null
  suggestedSgd?: number | null
  decision?: PricingDecision | null
}): InventoryState {
  const key = inventoryKeyOf(input.identity)
  const prev = input.state.items[key]
  const nextQty = Math.max(0, (prev?.quantityTotal ?? 0) + input.delta)
  const event: InventoryEvent = {
    occurredAtIso: input.occurredAtIso,
    delta: input.delta,
    reason: input.reason,
    mode: input.mode,
    condition: input.condition ?? null,
    suggestedSgd: input.suggestedSgd ?? null,
    benchmarkSource: input.decision?.benchmarkSource ?? null
  }
  const nextEvents = [event, ...(prev?.events ?? [])].slice(0, MAX_EVENTS)
  return {
    items: {
      ...input.state.items,
      [key]: {
        key,
        cardCode: input.identity.cardCode,
        variant: input.identity.variant ?? null,
        cardName: input.identity.cardName,
        rarity: input.identity.rarity,
        quantityTotal: nextQty,
        lastSeenAtIso: input.occurredAtIso,
        events: nextEvents
      }
    }
  }
}

export function makeDemoInventoryState(occurredAtIso: string): InventoryState {
  const base: InventoryState = { items: {} }
  const cards: Array<{ identity: CardIdentity; qty: number; suggestedSgd?: number | null; benchmarkSource?: PricingDecision['benchmarkSource'] | null }> = [
    {
      identity: {
        cardCode: 'SVP-001',
        cardName: 'Pikachu (Promo)',
        setCode: null,
        rarity: 'Promo',
        variant: 'standard',
        language: 'unknown',
        confidence: 1,
        ambiguity: false
      },
      qty: 2,
      suggestedSgd: 8.5,
      benchmarkSource: 'carousell'
    },
    {
      identity: {
        cardCode: 'MEW-151-199',
        cardName: 'Mew ex',
        setCode: null,
        rarity: 'UR',
        variant: 'standard',
        language: 'unknown',
        confidence: 1,
        ambiguity: false
      },
      qty: 1,
      suggestedSgd: 62,
      benchmarkSource: 'pricecharting'
    },
    {
      identity: {
        cardCode: 'EEV-165-050',
        cardName: 'Eevee',
        setCode: null,
        rarity: 'AR',
        variant: 'parallel',
        language: 'unknown',
        confidence: 1,
        ambiguity: false
      },
      qty: 3,
      suggestedSgd: 12,
      benchmarkSource: 'mercari'
    }
  ]

  return cards.reduce((state, c) => {
    const nextState = applyInventoryDelta({
      state,
      identity: c.identity,
      delta: c.qty,
      reason: 'saved',
      occurredAtIso,
      suggestedSgd: c.suggestedSgd ?? null,
      decision: c.benchmarkSource
        ? {
            benchmarkSource: c.benchmarkSource,
            benchmarkValue: c.suggestedSgd ?? 0,
            benchmarkCurrency: 'SGD',
            benchmarkExplanation: 'Demo data'
          }
        : null
    })
    return nextState
  }, base)
}
