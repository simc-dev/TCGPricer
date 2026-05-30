import type { Condition, PricingMode } from '../types'

export type InventoryKey = string

export type InventoryEvent = {
  occurredAtIso: string
  delta: number
  reason: 'saved' | 'adjust'
  mode?: PricingMode
  condition?: Condition | null
  suggestedSgd?: number | null
  benchmarkSource?: string | null
}

export type InventoryItem = {
  key: InventoryKey
  cardCode: string
  variant: string | null
  cardName: string
  rarity: string | null
  quantityTotal: number
  lastSeenAtIso: string
  events: InventoryEvent[]
}

export type InventoryState = {
  items: Record<InventoryKey, InventoryItem>
}
