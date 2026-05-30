import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearJpyToSgdRateCache, getJpyToSgdRate } from './fx'

afterEach(() => {
  clearJpyToSgdRateCache()
})

describe('getJpyToSgdRate', () => {
  it('fetches and caches within ttl', async () => {
    const fetchBefore = globalThis.fetch
    const fetchSpy = vi.fn(async () => {
      return new Response(JSON.stringify({ rates: { SGD: 0.01 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const t = 1000
    try {
      const r1 = await getJpyToSgdRate({ now: () => t, ttlMs: 60_000 })
      const r2 = await getJpyToSgdRate({ now: () => t, ttlMs: 60_000 })
      expect(r1).toBeCloseTo(0.01)
      expect(r2).toBeCloseTo(0.01)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.exchangerate.host/latest?base=JPY&symbols=SGD')
    } finally {
      globalThis.fetch = fetchBefore
    }
  })

  it('refetches after ttl expires', async () => {
    const fetchBefore = globalThis.fetch
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ rates: { SGD: 0.01 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ rates: { SGD: 0.02 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    globalThis.fetch = fetchSpy as unknown as typeof fetch

    let t = 0
    try {
      const r1 = await getJpyToSgdRate({ now: () => t, ttlMs: 1000 })
      t = 2000
      const r2 = await getJpyToSgdRate({ now: () => t, ttlMs: 1000 })
      expect(r1).toBeCloseTo(0.01)
      expect(r2).toBeCloseTo(0.02)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    } finally {
      globalThis.fetch = fetchBefore
    }
  })

  it('deduplicates concurrent requests', async () => {
    const fetchBefore = globalThis.fetch

    let resolveFetch: ((res: Response) => void) | null = null
    const fetchPromise = new Promise<Response>((r) => {
      resolveFetch = r
    })

    const fetchSpy = vi.fn(() => fetchPromise)
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    try {
      const p1 = getJpyToSgdRate({ now: () => 0, ttlMs: 60_000 })
      const p2 = getJpyToSgdRate({ now: () => 0, ttlMs: 60_000 })
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      resolveFetch?.(
        new Response(JSON.stringify({ rates: { SGD: 0.03 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBeCloseTo(0.03)
      expect(r2).toBeCloseTo(0.03)
    } finally {
      globalThis.fetch = fetchBefore
    }
  })
})
