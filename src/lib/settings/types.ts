import type { Condition, PriceSource } from '../types'

export type SellRoundingPreset = 'off' | 'conservative' | 'retail'

export type PricingSourceToggles = Record<PriceSource, boolean>

export type AdvancedPricingSettings = {
  buylistMultiplier: number
  buyRounding: 0.5 | 1
  conditionDiscounts: Record<Condition, number>
  sellRoundingPreset: SellRoundingPreset
}

export type AppSettings = {
  sources: PricingSourceToggles
  advanced: AdvancedPricingSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  sources: {
    carousell: true,
    mercari: true,
    pricecharting: true,
    yuyutei: true
  },
  advanced: {
    buylistMultiplier: 0.7,
    buyRounding: 0.5,
    conditionDiscounts: { nm: 0, lp: 0.1, mp: 0.2 },
    sellRoundingPreset: 'retail'
  }
}
