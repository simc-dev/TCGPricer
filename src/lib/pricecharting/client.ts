import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { PriceObservation } from '../types'

export type PriceChartingClientMode = 'live' | 'mock'

type RateLimiterDeps = {
  now: () => number
  sleep: (ms: number) => Promise<void>
}

export function create1rpsRateLimiter(input?: Partial<RateLimiterDeps>): () => Promise<void> {
  const now = input?.now ?? (() => Date.now())
  const sleep =
    input?.sleep ??
    ((ms: number) => {
      if (ms <= 0) return Promise.resolve()
      return new Promise((r) => setTimeout(r, ms))
    })

  let lastCallAt = 0

  return async () => {
    const t = now()
    const waitMs = Math.max(0, 1000 - (t - lastCallAt))
    if (waitMs > 0) await sleep(waitMs)
    lastCallAt = now()
  }
}

function defaultPriceChartingMode(): PriceChartingClientMode {
  if (process.env.PRICECHARTING_MODE === 'mock') return 'mock'
  if (process.env.PRICECHARTING_OFFLINE === '1') return 'mock'
  if (process.env.VITEST) return 'mock'
  return 'live'
}

function requirePriceChartingToken(): string {
  const token = process.env.PRICECHARTING_TOKEN
  if (!token) throw new Error('Missing env: PRICECHARTING_TOKEN')
  return token
}

function resolveFixturesDir(fixturesDir?: string): string {
  return (
    fixturesDir ??
    process.env.PRICECHARTING_FIXTURES_DIR ??
    path.join(process.cwd(), 'src', 'lib', 'pricecharting', '__fixtures__')
  )
}

async function readJsonFixture(fixturesDir: string, name: string): Promise<unknown> {
  const filePath = path.join(fixturesDir, name)
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as unknown
}

function toUsdObservation(json: unknown): PriceObservation | null {
  const obj = json as Record<string, unknown> | null
  const pricePennies = Number(obj?.['loose-price'] ?? obj?.['price'] ?? NaN)
  if (!Number.isFinite(pricePennies)) return null
  return { source: 'pricecharting', currency: 'USD', value: pricePennies / 100 }
}

const sharedLimiter = create1rpsRateLimiter()

export async function priceChartingFetchByCode(
  cardCode: string,
  options?: {
    mode?: PriceChartingClientMode
    fixturesDir?: string
    rateLimiter?: () => Promise<void>
  }
): Promise<PriceObservation | null> {
  const mode = options?.mode ?? defaultPriceChartingMode()

  if (mode === 'mock') {
    const fixturesDir = resolveFixturesDir(options?.fixturesDir)
    const json = await readJsonFixture(fixturesDir, `product-${encodeURIComponent(cardCode)}.json`)
    return toUsdObservation(json)
  }

  const token = requirePriceChartingToken()
  const limiter = options?.rateLimiter ?? sharedLimiter
  await limiter()

  const url = `https://www.pricecharting.com/api/product?t=${encodeURIComponent(token)}&id=${encodeURIComponent(cardCode)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = (await res.json()) as unknown
  return toUsdObservation(json)
}

