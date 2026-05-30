import { describe, expect, it } from 'vitest'

import { mapSimpleToAdvanced, SIMPLE_PRESETS } from './advancedPricingUi'

describe('advancedPricingUi presets', () => {
  it('maps Margin preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'margin', t: 0 })).toEqual(SIMPLE_PRESETS.margin)
  })

  it('maps Balance preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.5 })).toEqual(SIMPLE_PRESETS.balance)
  })

  it('maps Volume preset to expected advanced settings', () => {
    expect(mapSimpleToAdvanced({ preset: 'volume', t: 1 })).toEqual(SIMPLE_PRESETS.volume)
  })
})

describe('advancedPricingUi slider', () => {
  it('interpolates buylist multiplier', () => {
    const a = mapSimpleToAdvanced({ preset: 'balance', t: 0.25 })
    expect(a.buylistMultiplier).toBeGreaterThan(SIMPLE_PRESETS.margin.buylistMultiplier)
    expect(a.buylistMultiplier).toBeLessThan(SIMPLE_PRESETS.balance.buylistMultiplier)
  })

  it('uses $1 buy rounding for low t and $0.5 for higher t', () => {
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.2 }).buyRounding).toBe(1)
    expect(mapSimpleToAdvanced({ preset: 'balance', t: 0.5 }).buyRounding).toBe(0.5)
  })
})
