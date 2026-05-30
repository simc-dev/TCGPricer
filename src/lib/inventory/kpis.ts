import type { InventoryState } from './types'

export type InventoryKpis = {
  uniqueCount: number
  totalQuantity: number
  estimatedValueSgd: number
}

export function computeInventoryKpis(state: InventoryState): InventoryKpis {
  const items = Object.values(state.items ?? {})
  const uniqueCount = items.length

  let totalQuantity = 0
  let estimatedValueSgd = 0

  for (const it of items) {
    const qty = it.quantityTotal ?? 0
    totalQuantity += qty

    const latest = it.events?.find((e) => typeof e.suggestedSgd === 'number' && Number.isFinite(e.suggestedSgd))
    if (latest) {
      estimatedValueSgd += qty * latest.suggestedSgd
    }
  }

  return { uniqueCount, totalQuantity, estimatedValueSgd: Math.round(estimatedValueSgd) }
}
