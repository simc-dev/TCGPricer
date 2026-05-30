import { describe, expect, it } from 'vitest'
import { mercariExtract, mercariToObservation } from './normalize'

describe('mercari normalization', () => {
  it('extracts prices and newest timestamp from listings', () => {
    const extracted = mercariExtract({
      listings: [
        { price: '¥1000', createdAt: '2025-01-02T00:00:00.000Z' },
        { price: 900, createdAt: '2025-01-01T00:00:00.000Z' },
        { price: 'n/a' }
      ]
    })

    expect(extracted.jpyValues).toEqual([1000, 900])
    expect(extracted.newestTimestamp).toBe('2025-01-02T00:00:00.000Z')
  })

  it('builds a median-based observation', () => {
    expect(mercariToObservation({ jpyValues: [100, 200, 300, 400] })).toMatchObject({
      source: 'mercari',
      currency: 'JPY',
      value: 250,
      count: 4
    })
  })
})
