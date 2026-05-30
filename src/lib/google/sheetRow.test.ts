import { describe, expect, it } from 'vitest'

import type { QuoteResponse } from '../types'

import { buildMinimalSheetRowValues } from './sheetRow'

describe('buildMinimalSheetRowValues', () => {
  it('builds ordered values with FX when benchmark is JPY', () => {
    const quote: QuoteResponse = {
      identity: {
        cardCode: 'SV2a-001',
        cardName: 'Pikachu',
        setCode: 'SV2a',
        rarity: 'AR',
        variant: null,
        language: 'ja',
        confidence: 0.95,
        ambiguity: false
      },
      fxJpyToSgd: 0.01,
      observations: [],
      decision: {
        benchmarkSource: 'mercari',
        benchmarkValue: 1000,
        benchmarkCurrency: 'JPY',
        benchmarkExplanation: 'test'
      },
      suggested: { buy: 12.34, sell: 56.78 },
      manualApprovalRequired: false,
      manualApprovalReasons: [],
      notes: 'notes'
    }

    const values = buildMinimalSheetRowValues({
      timestampIso: '2026-05-30T00:00:00.000Z',
      identity: quote.identity,
      mode: 'buy',
      condition: 'nm',
      quote
    })

    expect(values).toEqual([
      '2026-05-30T00:00:00.000Z',
      'SV2a-001',
      'Pikachu',
      'SV2a',
      'AR',
      'Buy',
      null,
      'mercari',
      'JPY 1000',
      0.01,
      12.34,
      'notes'
    ])
  })

  it('omits FX when benchmark is SGD', () => {
    const quote: QuoteResponse = {
      identity: {
        cardCode: 'SV2a-001',
        cardName: 'Pikachu',
        setCode: 'SV2a',
        rarity: 'AR',
        variant: null,
        language: 'ja',
        confidence: 0.95,
        ambiguity: false
      },
      fxJpyToSgd: 0.01,
      observations: [],
      decision: {
        benchmarkSource: 'carousell',
        benchmarkValue: 100,
        benchmarkCurrency: 'SGD',
        benchmarkExplanation: 'test'
      },
      suggested: { buy: 12.34, sell: 56.78 },
      manualApprovalRequired: false,
      manualApprovalReasons: [],
      notes: 'notes'
    }

    const values = buildMinimalSheetRowValues({
      timestampIso: '2026-05-30T00:00:00.000Z',
      identity: quote.identity,
      mode: 'sell',
      condition: 'lp',
      quote
    })

    expect(values[9]).toBeNull()
    expect(values[6]).toBe('LP')
    expect(values[10]).toBe(56.78)
  })
})
