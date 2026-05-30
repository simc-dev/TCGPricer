import { extractSgdCandidates, median } from '../bait/parse'
import { openRouterChatCompletions } from '../openrouter/client'
import { CAROUSELL_PARSE_SYSTEM, carousellParseUserPrompt } from '../openrouter/prompts'
import type { PriceObservation } from '../types'

export type CarousellListing = {
  title?: string
  price?: number | string
  description?: string
  createdAt?: string
}

type CarousellParseResult = {
  priceSgd: number | null
  isBait: boolean
  reason: string
}

function toNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^\d.]/g, '')
  if (cleaned.length === 0) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function isBaitPlaceholderPrice(value: number): boolean {
  return value === 0 || value === 1 || value === 9999
}

function isOpenRouterOffline(): boolean {
  if (process.env.OPEN_ROUTER_OFFLINE === '1') return true
  if (!process.env.OPEN_ROUTER_API_KEY) return true
  return false
}

function resolveOpenRouterTextModel(): string {
  return process.env.OPEN_ROUTER_TEXT_MODEL ?? 'openai/gpt-4o-mini'
}

function toCarousellParseResult(value: unknown): CarousellParseResult | null {
  const v = value as Record<string, unknown> | null
  const priceSgd = typeof v?.priceSgd === 'number' && Number.isFinite(v.priceSgd) ? v.priceSgd : null
  const isBait = typeof v?.isBait === 'boolean' ? v.isBait : false
  const reason = typeof v?.reason === 'string' ? v.reason : ''
  return { priceSgd, isBait, reason }
}

async function parsePriceFromModel(listingText: string): Promise<CarousellParseResult | null> {
  const content = await openRouterChatCompletions({
    model: resolveOpenRouterTextModel(),
    temperature: 0,
    messages: [
      { role: 'system', content: CAROUSELL_PARSE_SYSTEM },
      { role: 'user', content: carousellParseUserPrompt(listingText) }
    ]
  })

  try {
    return toCarousellParseResult(JSON.parse(content) as unknown)
  } catch {
    return null
  }
}

function parsePriceDeterministic(input: {
  title?: string
  priceSgd?: number | null
  description?: string
}): CarousellParseResult {
  const listingText = [input.title, input.description].filter((v): v is string => typeof v === 'string' && v.length > 0).join('\n')
  const candidates = extractSgdCandidates(listingText)
  const displayIsBait = typeof input.priceSgd === 'number' ? isBaitPlaceholderPrice(input.priceSgd) : false

  if (candidates.length === 0) {
    return { priceSgd: null, isBait: displayIsBait, reason: 'no numeric candidates' }
  }

  const best = candidates
    .map((n) => ({
      n,
      score: (n >= 5 && n <= 5000 ? 3 : 0) + (isBaitPlaceholderPrice(n) ? -10 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0]

  const filtered = candidates.filter((n) => !isBaitPlaceholderPrice(n) && n >= 5 && n <= 5000)
  const priceSgd = filtered.length > 0 ? filtered[filtered.length - 1] : best?.score >= 0 ? best.n : null

  if (!priceSgd) return { priceSgd: null, isBait: displayIsBait, reason: 'no plausible price' }

  const hasBaitNumbers = candidates.some((n) => isBaitPlaceholderPrice(n))
  return { priceSgd, isBait: displayIsBait || hasBaitNumbers, reason: 'heuristic parse' }
}

async function resolveListingPrice(listing: CarousellListing): Promise<number | null> {
  const displayedPriceSgd = toNumber(listing.price)
  const description = typeof listing.description === 'string' && listing.description.trim().length > 0 ? listing.description : undefined

  if (!description) {
    if (typeof displayedPriceSgd !== 'number') return null
    return isBaitPlaceholderPrice(displayedPriceSgd) ? null : displayedPriceSgd
  }

  const listingText = [
    listing.title ? `Title: ${listing.title}` : null,
    typeof listing.price !== 'undefined' ? `Displayed price: ${String(listing.price)}` : null,
    `Description: ${description}`
  ]
    .filter((v): v is string => typeof v === 'string')
    .join('\n')

  const parsed = isOpenRouterOffline()
    ? parsePriceDeterministic({ title: listing.title, priceSgd: displayedPriceSgd, description })
    : ((await parsePriceFromModel(listingText)) ?? parsePriceDeterministic({ title: listing.title, priceSgd: displayedPriceSgd, description }))

  if (typeof parsed.priceSgd === 'number' && Number.isFinite(parsed.priceSgd) && parsed.priceSgd > 0) {
    return parsed.priceSgd
  }

  if (typeof displayedPriceSgd === 'number' && !isBaitPlaceholderPrice(displayedPriceSgd)) return displayedPriceSgd
  return null
}

function newestIsoTimestamp(values: Array<string | undefined>): string | undefined {
  const timestamps = values
    .map((v) => (typeof v === 'string' ? Date.parse(v) : NaN))
    .filter((n) => Number.isFinite(n)) as number[]
  if (timestamps.length === 0) return undefined
  return new Date(Math.max(...timestamps)).toISOString()
}

export async function carousellExtract(input: { listings: CarousellListing[] }): Promise<{
  pricesSgd: number[]
  newestTimestamp?: string
}> {
  const resolved = await Promise.all(input.listings.map((l) => resolveListingPrice(l)))
  const pricesSgd = resolved.filter((n): n is number => typeof n === 'number')
  const newestTimestamp = newestIsoTimestamp(input.listings.map((l) => l.createdAt))
  return { pricesSgd, newestTimestamp }
}

export function carousellToObservation(input: {
  pricesSgd: number[]
  newestTimestamp?: string
}): PriceObservation {
  return {
    source: 'carousell',
    currency: 'SGD',
    value: median(input.pricesSgd),
    count: input.pricesSgd.length,
    newestTimestamp: input.newestTimestamp,
    notes: 'median of clean listings'
  }
}
