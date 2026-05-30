import { describe, expect, it, vi } from 'vitest'
import { carousellExtract, carousellToObservation } from './normalize'

vi.mock('../openrouter/client', () => ({
  openRouterChatCompletions: vi.fn()
}))

import { openRouterChatCompletions } from '../openrouter/client'

describe('carousell normalization', () => {
  it('extracts prices and newest timestamp from listings', () => {
    return carousellExtract({
      listings: [
        { price: '$120', createdAt: '2025-01-01T00:00:00.000Z' },
        { price: 85, createdAt: '2025-01-03T00:00:00.000Z' },
        { price: 'n/a', createdAt: 'not-a-date' }
      ]
    }).then((extracted) => {
      expect(extracted.pricesSgd).toEqual([120, 85])
      expect(extracted.newestTimestamp).toBe('2025-01-03T00:00:00.000Z')
    })
  })

  it('builds a median-based observation', () => {
    expect(carousellToObservation({ pricesSgd: [10, 20, 30] })).toMatchObject({
      source: 'carousell',
      currency: 'SGD',
      value: 20,
      count: 3
    })
  })

  it('uses model output to ignore bait placeholder prices', async () => {
    const beforeKey = process.env.OPEN_ROUTER_API_KEY
    const beforeOffline = process.env.OPEN_ROUTER_OFFLINE
    process.env.OPEN_ROUTER_API_KEY = 'test'
    delete process.env.OPEN_ROUTER_OFFLINE

    try {
      vi.mocked(openRouterChatCompletions).mockResolvedValueOnce(
        JSON.stringify({ priceSgd: 85, isBait: true, reason: 'actual price in description' })
      )

      const extracted = await carousellExtract({
        listings: [
          { title: 'OP01-001', price: '$1', description: 'Placeholder price. Actual $85 firm.', createdAt: '2025-01-01T00:00:00.000Z' }
        ]
      })

      expect(extracted.pricesSgd).toEqual([85])
      expect(openRouterChatCompletions).toHaveBeenCalledTimes(1)
    } finally {
      if (beforeKey === undefined) delete process.env.OPEN_ROUTER_API_KEY
      else process.env.OPEN_ROUTER_API_KEY = beforeKey
      if (beforeOffline === undefined) delete process.env.OPEN_ROUTER_OFFLINE
      else process.env.OPEN_ROUTER_OFFLINE = beforeOffline
    }
  })

  it('drops bait listings when no real price is found', async () => {
    const beforeKey = process.env.OPEN_ROUTER_API_KEY
    const beforeOffline = process.env.OPEN_ROUTER_OFFLINE
    process.env.OPEN_ROUTER_API_KEY = 'test'
    delete process.env.OPEN_ROUTER_OFFLINE

    try {
      vi.mocked(openRouterChatCompletions).mockResolvedValueOnce(
        JSON.stringify({ priceSgd: null, isBait: true, reason: 'no price mentioned' })
      )

      const extracted = await carousellExtract({
        listings: [{ price: 9999, description: 'Price placeholder, DM to discuss', createdAt: '2025-01-01T00:00:00.000Z' }]
      })

      expect(extracted.pricesSgd).toEqual([])
    } finally {
      if (beforeKey === undefined) delete process.env.OPEN_ROUTER_API_KEY
      else process.env.OPEN_ROUTER_API_KEY = beforeKey
      if (beforeOffline === undefined) delete process.env.OPEN_ROUTER_OFFLINE
      else process.env.OPEN_ROUTER_OFFLINE = beforeOffline
    }
  })

  it('falls back deterministically when OpenRouter is offline', async () => {
    const beforeKey = process.env.OPEN_ROUTER_API_KEY
    const beforeOffline = process.env.OPEN_ROUTER_OFFLINE
    delete process.env.OPEN_ROUTER_API_KEY
    process.env.OPEN_ROUTER_OFFLINE = '1'

    try {
      vi.mocked(openRouterChatCompletions).mockClear()

      const extracted = await carousellExtract({
        listings: [{ price: 1, description: 'Bait $1. Actual selling $120 meetup only.', createdAt: '2025-01-01T00:00:00.000Z' }]
      })

      expect(extracted.pricesSgd).toEqual([120])
      expect(openRouterChatCompletions).not.toHaveBeenCalled()
    } finally {
      if (beforeKey === undefined) delete process.env.OPEN_ROUTER_API_KEY
      else process.env.OPEN_ROUTER_API_KEY = beforeKey
      if (beforeOffline === undefined) delete process.env.OPEN_ROUTER_OFFLINE
      else process.env.OPEN_ROUTER_OFFLINE = beforeOffline
    }
  })
})
