import type { AdvancedPricingSettings, SellRoundingPreset } from './types'

export type SimplePricingPreset = 'margin' | 'balance' | 'volume'

export const SIMPLE_PRESETS: Record<SimplePricingPreset, AdvancedPricingSettings> = {
  margin: {
    buylistMultiplier: 0.55,
    buyRounding: 1,
    conditionDiscounts: { nm: 0, lp: 0.05, mp: 0.1 },
    sellRoundingPreset: 'retail'
  },
  balance: {
    buylistMultiplier: 0.65,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.1, mp: 0.2 },
    sellRoundingPreset: 'retail'
  },
  volume: {
    buylistMultiplier: 0.75,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.15, mp: 0.25 },
    sellRoundingPreset: 'conservative'
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpDiscounts(
  a: AdvancedPricingSettings['conditionDiscounts'],
  b: AdvancedPricingSettings['conditionDiscounts'],
  t: number
): AdvancedPricingSettings['conditionDiscounts'] {
  return {
    nm: lerp(a.nm, b.nm, t),
    lp: lerp(a.lp, b.lp, t),
    mp: lerp(a.mp, b.mp, t)
  }
}

export function presetLabel(p: SimplePricingPreset): string {
  if (p === 'margin') return 'Margin'
  if (p === 'balance') return 'Balance'
  return 'Volume'
}

export function sellRoundingLabel(p: SellRoundingPreset): string {
  if (p === 'off') return 'Keep decimals'
  if (p === 'conservative') return 'Round to $0.50'
  return 'Round to $1.00'
}

export function buyRoundingLabel(v: 0.5 | 1): string {
  return v === 1 ? 'Round to $1.00' : 'Round to $0.50'
}

export function mapSimpleToAdvanced(input: { preset: SimplePricingPreset; t: number }): AdvancedPricingSettings {
  const t01 = clamp01(input.t)
  const left = t01 <= 0.5 ? SIMPLE_PRESETS.margin : SIMPLE_PRESETS.balance
  const right = t01 <= 0.5 ? SIMPLE_PRESETS.balance : SIMPLE_PRESETS.volume
  const localT = t01 <= 0.5 ? t01 / 0.5 : (t01 - 0.5) / 0.5

  const buylistMultiplier = lerp(left.buylistMultiplier, right.buylistMultiplier, localT)
  const conditionDiscounts = lerpDiscounts(left.conditionDiscounts, right.conditionDiscounts, localT)

  const buyRounding: 0.5 | 1 = t01 < 0.33 ? 1 : 0.5
  const sellRoundingPreset: SellRoundingPreset = t01 > 0.66 ? 'conservative' : 'retail'

  return { buylistMultiplier, buyRounding, conditionDiscounts, sellRoundingPreset }
}
