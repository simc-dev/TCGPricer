import type { PriceObservation, PricingDecision } from '@/lib/types'

export function buildNotes(input: { observations: PriceObservation[]; decision: PricingDecision | null }): string {
  if (!input.decision) return 'No benchmark available'

  const parts: string[] = []
  parts.push(`Benchmark: ${input.decision.benchmarkSource}`)
  parts.push(input.decision.benchmarkExplanation)

  const yuyutei = input.observations.find((o) => o.source === 'yuyutei')
  if (yuyutei?.notes === 'oos') parts.push('Yuyutei OOS')

  const carousell = input.observations.find((o) => o.source === 'carousell')
  if (carousell && (carousell.count ?? 0) > 0) parts.push(`Carousell comps: ${carousell.count}`)

  return parts.join('. ')
}
