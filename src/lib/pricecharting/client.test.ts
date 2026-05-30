import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { create1rpsRateLimiter, priceChartingFetchByCode } from './client'

describe('pricecharting client (mock mode)', () => {
  it('loads product response from fixture without requiring token', async () => {
    const before = process.env.PRICECHARTING_TOKEN
    delete process.env.PRICECHARTING_TOKEN
    try {
      const fixturesDir = path.join(process.cwd(), 'src', 'lib', 'pricecharting', '__fixtures__')
      const obs = await priceChartingFetchByCode('test~pikachu', { mode: 'mock', fixturesDir })
      expect(obs).toEqual({ source: 'pricecharting', currency: 'USD', value: 123.45 })
    } finally {
      if (before === undefined) delete process.env.PRICECHARTING_TOKEN
      else process.env.PRICECHARTING_TOKEN = before
    }
  })
})

describe('create1rpsRateLimiter', () => {
  it('sleeps to enforce 1 request per second', async () => {
    const sleeps: number[] = []
    let now = 100_000

    const limiter = create1rpsRateLimiter({
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms)
        now += ms
      }
    })

    await limiter()
    now += 100
    await limiter()
    expect(sleeps).toEqual([900])

    now += 1000
    await limiter()
    expect(sleeps).toEqual([900])
  })
})

describe('pricecharting client (live mode)', () => {
  it('uses fetch + token + limiter and parses USD cents', async () => {
    const beforeToken = process.env.PRICECHARTING_TOKEN
    process.env.PRICECHARTING_TOKEN = 'token_123'

    const fetchBefore = globalThis.fetch
    const fetchSpy = vi.fn(async () => {
      return new Response(JSON.stringify({ 'loose-price': 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const limiter = vi.fn(async () => {})
    try {
      const obs = await priceChartingFetchByCode('xy z', { mode: 'live', rateLimiter: limiter })
      expect(limiter).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0]?.[0]).toBe(
        'https://www.pricecharting.com/api/product?t=token_123&id=xy%20z'
      )
      expect(obs).toEqual({ source: 'pricecharting', currency: 'USD', value: 2 })
    } finally {
      globalThis.fetch = fetchBefore
      if (beforeToken === undefined) delete process.env.PRICECHARTING_TOKEN
      else process.env.PRICECHARTING_TOKEN = beforeToken
    }
  })
})

