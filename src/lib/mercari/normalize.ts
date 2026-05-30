import { median } from '../bait/parse'
import type { PriceObservation } from '../types'

export type MercariListing = {
  title?: string
  price?: number | string
  createdAt?: string
}

function toNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^\d]/g, '')
  if (cleaned.length === 0) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function newestIsoTimestamp(values: Array<string | undefined>): string | undefined {
  const timestamps = values
    .map((v) => (typeof v === 'string' ? Date.parse(v) : NaN))
    .filter((n) => Number.isFinite(n)) as number[]
  if (timestamps.length === 0) return undefined
  return new Date(Math.max(...timestamps)).toISOString()
}

export function mercariExtract(input: { listings: MercariListing[] }): {
  jpyValues: number[]
  newestTimestamp?: string
} {
  const jpyValues = input.listings.map((l) => toNumber(l.price)).filter((n): n is number => n !== null)
  const newestTimestamp = newestIsoTimestamp(input.listings.map((l) => l.createdAt))
  return { jpyValues, newestTimestamp }
}

export function mercariToObservation(input: {
  jpyValues: number[]
  newestTimestamp?: string
}): PriceObservation {
  return {
    source: 'mercari',
    currency: 'JPY',
    value: median(input.jpyValues),
    count: input.jpyValues.length,
    newestTimestamp: input.newestTimestamp,
    notes: 'median of comps'
  }
}
