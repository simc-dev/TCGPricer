import type { CardIdentity, Condition, PricingMode, QuoteResponse } from '../types'

export function buildMinimalSheetRowValues(input: {
  timestampIso: string
  identity: CardIdentity
  mode: PricingMode
  condition: Condition
  quote: QuoteResponse
}): Array<string | number | null> {
  const suggested = input.mode === 'buy' ? input.quote.suggested.buy : input.quote.suggested.sell
  const decision = input.quote.decision
  const benchmarkSource = decision?.benchmarkSource ?? null
  const benchmarkPrice = decision ? `${decision.benchmarkCurrency} ${decision.benchmarkValue}` : null
  const fxRate = decision?.benchmarkCurrency === 'JPY' ? input.quote.fxJpyToSgd : null

  return [
    input.timestampIso,
    input.identity.cardCode,
    input.identity.cardName,
    input.identity.setCode,
    input.identity.rarity,
    input.mode === 'buy' ? 'Buy' : 'Sell',
    input.mode === 'sell' ? input.condition.toUpperCase() : null,
    benchmarkSource,
    benchmarkPrice,
    fxRate,
    suggested ?? null,
    input.quote.notes
  ]
}
