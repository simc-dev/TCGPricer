import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { parseYuyuteiHtml, yuyuteiFetch } from './scrape'

function fixturesDir(): string {
  return path.join(process.cwd(), 'src', 'lib', 'yuyutei', '__fixtures__')
}

async function readFixture(name: string): Promise<string> {
  return readFile(path.join(fixturesDir(), name), 'utf8')
}

describe('parseYuyuteiHtml (fixtures)', () => {
  it('extracts price + inStock from an in-stock page', async () => {
    const html = await readFixture('sell-xy%20z.html')
    expect(parseYuyuteiHtml(html)).toEqual({ priceJpy: 12345, inStock: true })
  })

  it('extracts price + out-of-stock state', async () => {
    const html = await readFixture('sell-oos.html')
    expect(parseYuyuteiHtml(html)).toEqual({ priceJpy: 999, inStock: false })
  })
})

describe('yuyuteiFetch', () => {
  it('loads fixture HTML in mock mode (no network)', async () => {
    const fetchBefore = globalThis.fetch
    const fetchSpy = vi.fn(async () => {
      throw new Error('network should not be called in mock mode')
    })
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    try {
      const obs = await yuyuteiFetch('xy z', { mode: 'mock', fixturesDir: fixturesDir() })
      expect(fetchSpy).toHaveBeenCalledTimes(0)
      expect(obs).toEqual({ source: 'yuyutei', currency: 'JPY', value: 12345, notes: 'in stock' })
    } finally {
      globalThis.fetch = fetchBefore
    }
  })

  it('uses fetch in live mode and parses response HTML', async () => {
    const html = await readFixture('sell-oos.html')
    const fetchBefore = globalThis.fetch

    const fetchSpy = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect((init?.headers as Record<string, string> | undefined)?.['User-Agent']).toBe('Mozilla/5.0')
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
    })

    globalThis.fetch = fetchSpy as unknown as typeof fetch

    try {
      const obs = await yuyuteiFetch('oos', { mode: 'live' })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://yuyu-tei.jp/sell/oos')
      expect(obs).toEqual({ source: 'yuyutei', currency: 'JPY', value: 999, notes: 'oos' })
    } finally {
      globalThis.fetch = fetchBefore
    }
  })
})

