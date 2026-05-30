import { NextResponse } from 'next/server'

import type { ApifyClientMode } from '@/lib/apify/client'
import { apifyGetDatasetItems, apifyRunActor } from '@/lib/apify/client'
import { carousellExtract, carousellToObservation } from '@/lib/carousell/normalize'
import { getJpyToSgdRate } from '@/lib/fx'
import { mercariExtract, mercariToObservation } from '@/lib/mercari/normalize'
import type { PriceChartingClientMode } from '@/lib/pricecharting/client'
import { priceChartingFetchByCode } from '@/lib/pricecharting/client'
import { manualApprovalGate, selectBenchmark } from '@/lib/pricing/benchmark'
import { computeBuyPrice, computeSellPrice } from '@/lib/pricing/math'
import { buildNotes } from '@/lib/pricing/notes'
import { DEFAULT_SETTINGS, type AdvancedPricingSettings } from '@/lib/settings/types'
import type { CardIdentity, Condition, PriceObservation, PriceSource, PricingMode, QuoteResponse } from '@/lib/types'
import type { YuyuteiClientMode } from '@/lib/yuyutei/scrape'
import { yuyuteiFetch } from '@/lib/yuyutei/scrape'

export const runtime = 'nodejs'

type QuoteRequest = {
  identity: CardIdentity
  mode: PricingMode
  condition: Condition | null
  enabledSources: Record<PriceSource, boolean>
  advanced: AdvancedPricingSettings
}

function normalizeToSgd(input: { value: number; currency: 'SGD' | 'JPY' | 'USD'; fxJpyToSgd: number }): number {
  if (input.currency === 'SGD') return input.value
  if (input.currency === 'JPY') return input.value * input.fxJpyToSgd
  return input.value
}

function resolveApifyMode(): ApifyClientMode {
  if (process.env.APIFY_MODE === 'mock') return 'mock'
  if (process.env.APIFY_OFFLINE === '1') return 'mock'
  if (!process.env.APIFY_TOKEN) return 'mock'
  return 'live'
}

function resolvePriceChartingMode(): PriceChartingClientMode {
  if (process.env.PRICECHARTING_MODE === 'mock') return 'mock'
  if (process.env.PRICECHARTING_OFFLINE === '1') return 'mock'
  if (!process.env.PRICECHARTING_TOKEN) return 'mock'
  return 'live'
}

function resolveYuyuteiMode(): YuyuteiClientMode | undefined {
  if (process.env.YUYUTEI_MODE === 'mock') return 'mock'
  if (process.env.YUYUTEI_OFFLINE === '1') return 'mock'
  return undefined
}

function isSellRoundingPreset(v: unknown): v is AdvancedPricingSettings['sellRoundingPreset'] {
  return v === 'off' || v === 'conservative' || v === 'retail'
}

function toQuoteRequest(value: unknown): QuoteRequest | null {
  const v = value as Record<string, unknown> | null
  const identity = v?.identity as CardIdentity | null
  const mode = v?.mode
  const condition = v?.condition
  const inputs = v?.inputs as Record<string, unknown> | null
  const enabledSources = v?.enabledSources as Record<string, unknown> | null
  const advanced = v?.advanced as Record<string, unknown> | null

  if (!identity || typeof identity !== 'object') return null
  if (mode !== 'buy' && mode !== 'sell') return null

  const src = enabledSources ?? {}
  const adv = advanced ?? {}
  const advDiscounts = (adv?.conditionDiscounts as Record<string, unknown> | null) ?? null
  const buyRoundingRaw = adv.buyRounding ?? inputs?.buyRounding
  const buyRounding = buyRoundingRaw === 1 || buyRoundingRaw === 0.5 ? (buyRoundingRaw as 0.5 | 1) : DEFAULT_SETTINGS.advanced.buyRounding
  const buylistMultiplierRaw = adv.buylistMultiplier ?? inputs?.buylistMultiplier
  const buylistMultiplier =
    typeof buylistMultiplierRaw === 'number' ? buylistMultiplierRaw : DEFAULT_SETTINGS.advanced.buylistMultiplier

  return {
    identity,
    mode,
    condition: condition === 'nm' || condition === 'lp' || condition === 'mp' ? condition : null,
    enabledSources: {
      carousell: typeof src.carousell === 'boolean' ? src.carousell : true,
      mercari: typeof src.mercari === 'boolean' ? src.mercari : true,
      pricecharting: typeof src.pricecharting === 'boolean' ? src.pricecharting : true,
      yuyutei: typeof src.yuyutei === 'boolean' ? src.yuyutei : true
    },
    advanced: {
      buylistMultiplier,
      buyRounding,
      conditionDiscounts: {
        nm: typeof advDiscounts?.nm === 'number' ? advDiscounts.nm : DEFAULT_SETTINGS.advanced.conditionDiscounts.nm,
        lp: typeof advDiscounts?.lp === 'number' ? advDiscounts.lp : DEFAULT_SETTINGS.advanced.conditionDiscounts.lp,
        mp: typeof advDiscounts?.mp === 'number' ? advDiscounts.mp : DEFAULT_SETTINGS.advanced.conditionDiscounts.mp
      },
      sellRoundingPreset: isSellRoundingPreset(adv.sellRoundingPreset) ? adv.sellRoundingPreset : DEFAULT_SETTINGS.advanced.sellRoundingPreset
    }
  }
}

async function fetchCarousell(cardCode: string): Promise<PriceObservation | null> {
  const mode = resolveApifyMode()
  const actorId =
    process.env.APIFY_CAROUSELL_ACTOR_ID ??
    (mode === 'mock' ? 'test~carousell' : null)

  if (!actorId) return null

  try {
    const run = (await apifyRunActor({ actorId, runInput: { q: cardCode }, mode })) as unknown
    const datasetId = (run as { data?: { defaultDatasetId?: unknown } } | null)?.data?.defaultDatasetId
    if (typeof datasetId !== 'string') return null

    const items = await apifyGetDatasetItems({ datasetId, limit: 20, mode })
    const listings = items.map((it) => it as { title?: unknown; price?: unknown; description?: unknown; createdAt?: unknown })
    const extracted = await carousellExtract({
      listings: listings.map((l) => ({
        title: typeof l.title === 'string' ? l.title : undefined,
        price: typeof l.price === 'number' || typeof l.price === 'string' ? l.price : undefined,
        description: typeof l.description === 'string' ? l.description : undefined,
        createdAt: typeof l.createdAt === 'string' ? l.createdAt : undefined
      }))
    })

    if (extracted.pricesSgd.length === 0) return null
    return carousellToObservation(extracted)
  } catch {
    return null
  }
}

async function fetchMercari(cardCode: string): Promise<PriceObservation | null> {
  const mode = resolveApifyMode()
  const actorId =
    process.env.APIFY_MERCARI_ACTOR_ID ??
    (mode === 'mock' ? 'test~mercari' : null)

  if (!actorId) return null

  try {
    const run = (await apifyRunActor({ actorId, runInput: { q: cardCode }, mode })) as unknown
    const datasetId = (run as { data?: { defaultDatasetId?: unknown } } | null)?.data?.defaultDatasetId
    if (typeof datasetId !== 'string') return null

    const items = await apifyGetDatasetItems({ datasetId, limit: 20, mode })
    const listings = items.map((it) => it as { title?: unknown; price?: unknown; createdAt?: unknown })
    const extracted = mercariExtract({
      listings: listings.map((l) => ({
        title: typeof l.title === 'string' ? l.title : undefined,
        price: typeof l.price === 'number' || typeof l.price === 'string' ? l.price : undefined,
        createdAt: typeof l.createdAt === 'string' ? l.createdAt : undefined
      }))
    })

    if (extracted.jpyValues.length === 0) return null
    return mercariToObservation(extracted)
  } catch {
    return null
  }
}

async function fetchPriceCharting(cardCode: string): Promise<PriceObservation | null> {
  try {
    return await priceChartingFetchByCode(cardCode, { mode: resolvePriceChartingMode() })
  } catch {
    return null
  }
}

async function fetchYuyutei(cardCode: string): Promise<PriceObservation | null> {
  try {
    const mode = resolveYuyuteiMode()
    return await yuyuteiFetch(cardCode, mode ? { mode } : undefined)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const body = toQuoteRequest(json)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const fxJpyToSgd = await getJpyToSgdRate()

  const observations: PriceObservation[] = []

  const [carousell, mercari, pricecharting, yuyutei] = await Promise.all([
    body.enabledSources.carousell ? fetchCarousell(body.identity.cardCode) : Promise.resolve(null),
    body.enabledSources.mercari ? fetchMercari(body.identity.cardCode) : Promise.resolve(null),
    body.enabledSources.pricecharting ? fetchPriceCharting(body.identity.cardCode) : Promise.resolve(null),
    body.enabledSources.yuyutei ? fetchYuyutei(body.identity.cardCode) : Promise.resolve(null)
  ])

  if (carousell) observations.push(carousell)
  if (mercari) observations.push(mercari)
  if (pricecharting) observations.push(pricecharting)
  if (yuyutei) observations.push(yuyutei)

  const decision = selectBenchmark(observations)
  const baseSgd = decision
    ? normalizeToSgd({ value: decision.benchmarkValue, currency: decision.benchmarkCurrency, fxJpyToSgd })
    : NaN

  const suggestedBuy = Number.isFinite(baseSgd)
    ? computeBuyPrice({ baseSgd, buylistMultiplier: body.advanced.buylistMultiplier, rounding: body.advanced.buyRounding })
    : null

  const suggestedSell =
    Number.isFinite(baseSgd) && body.condition
      ? computeSellPrice({
          baseSgd,
          condition: body.condition,
          conditionDiscounts: body.advanced.conditionDiscounts,
          roundingPreset: body.advanced.sellRoundingPreset
        })
      : null

  const selectedSuggested = body.mode === 'buy' ? suggestedBuy : suggestedSell
  const gate = manualApprovalGate({
    suggestedSgd: selectedSuggested ?? 0,
    confidence: body.identity.confidence,
    ambiguity: body.identity.ambiguity
  })

  const notes = buildNotes({ observations, decision })

  const resp: QuoteResponse = {
    identity: body.identity,
    fxJpyToSgd,
    observations,
    decision,
    suggested: { buy: suggestedBuy, sell: suggestedSell },
    manualApprovalRequired: gate.required,
    manualApprovalReasons: gate.reasons,
    notes
  }

  return NextResponse.json(resp)
}
