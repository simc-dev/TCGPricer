import { describe, expect, it } from 'vitest'

import type { PriceObservation, PricingDecision } from '../types'
import { buildNotes } from './notes'

function obs(partial: Partial<PriceObservation>): PriceObservation {
  return { source: 'mercari', currency: 'JPY', value: 1, ...partial }
}

function decision(partial: Partial<PricingDecision>): PricingDecision {
  return {
    benchmarkSource: 'carousell',
    benchmarkValue: 10,
    benchmarkCurrency: 'SGD',
    benchmarkExplanation: 'Carousell median from >=3 clean listings within 30 days',
    ...partial
  }
}

describe('buildNotes', () => {
  it('returns a fallback string when no benchmark is available', () => {
    expect(buildNotes({ observations: [], decision: null })).toBe('No benchmark available')
  })

  it('includes benchmark source and explanation', () => {
    const notes = buildNotes({ observations: [], decision: decision({ benchmarkSource: 'mercari' }) })
    expect(notes).toContain('Benchmark: mercari')
    expect(notes).toContain('Carousell median from >=3 clean listings within 30 days')
  })

  it('adds Yuyutei OOS marker when yuyutei notes indicate oos', () => {
    const notes = buildNotes({ observations: [obs({ source: 'yuyutei', notes: 'oos', currency: 'JPY', value: 9000 })], decision: decision({}) })
    expect(notes).toContain('Yuyutei OOS')
  })

  it('adds Carousell comps when present', () => {
    const notes = buildNotes({
      observations: [obs({ source: 'carousell', currency: 'SGD', value: 100, count: 4 })],
      decision: decision({})
    })
    expect(notes).toContain('Carousell comps: 4')
  })
})
