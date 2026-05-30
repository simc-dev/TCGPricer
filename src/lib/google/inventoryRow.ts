import type { CardIdentity, Condition, PricingDecision, PricingMode } from '../types'

export function buildInventoryLogRowValues(input: {
  timestampIso: string
  identity: CardIdentity
  delta: number
  reason: 'saved' | 'adjust'
  mode?: PricingMode
  condition?: Condition | null
  suggestedSgd?: number | null
  decision?: PricingDecision | null
}): Array<string | number | null> {
  return [
    input.timestampIso,
    input.identity.cardCode || null,
    input.identity.cardName || null,
    input.identity.variant ?? null,
    input.delta,
    input.reason,
    input.mode ?? null,
    input.condition ?? null,
    input.suggestedSgd ?? null,
    input.decision?.benchmarkSource ?? null
  ]
}
