import { readFile } from 'node:fs/promises'
import path from 'node:path'

import * as cheerio from 'cheerio'

import type { PriceObservation } from '../types'

export type YuyuteiClientMode = 'live' | 'mock'

export function parseYuyuteiHtml(html: string): { priceJpy: number; inStock: boolean } | null {
  const $ = cheerio.load(html)

  const priceText = [
    $('.price').first().text(),
    $('.item_price').first().text(),
    $('.sell_price').first().text(),
    $('#price').first().text(),
    $('#sell_price').first().text()
  ]
    .map((t) => t?.trim())
    .find((t) => Boolean(t))

  const yenMatch = priceText?.match(/[¥￥]\s*([\d,]+)/)
  const numeric = (yenMatch?.[1] ?? priceText ?? '').replace(/[^\d]/g, '')
  const priceJpy = Number(numeric)
  if (!Number.isFinite(priceJpy) || priceJpy <= 0) return null

  const pageText = $('body').text().replace(/\s+/g, ' ').trim().toLowerCase()
  const stockText = [
    $('.stock').first().text(),
    $('.zaiko').first().text(),
    $('.inventory').first().text()
  ]
    .map((t) => t?.trim())
    .find((t) => Boolean(t))

  const stockHaystack = `${stockText ?? ''} ${pageText}`
  const soldOutMarkers = ['sold out', 'out of stock', '在庫なし', '品切れ', '売り切れ']
  const inStockMarkers = ['in stock', '在庫あり']

  const isSoldOut = soldOutMarkers.some((m) => stockHaystack.includes(m.toLowerCase()))
  const isInStock = inStockMarkers.some((m) => stockHaystack.includes(m.toLowerCase()))
  const inStock = isInStock && !isSoldOut

  return { priceJpy, inStock }
}

function defaultYuyuteiMode(): YuyuteiClientMode {
  if (process.env.YUYUTEI_MODE === 'mock') return 'mock'
  if (process.env.YUYUTEI_OFFLINE === '1') return 'mock'
  if (process.env.VITEST) return 'mock'
  return 'live'
}

function resolveFixturesDir(fixturesDir?: string): string {
  return (
    fixturesDir ??
    process.env.YUYUTEI_FIXTURES_DIR ??
    path.join(process.cwd(), 'src', 'lib', 'yuyutei', '__fixtures__')
  )
}

async function readHtmlFixture(fixturesDir: string, name: string): Promise<string> {
  const filePath = path.join(fixturesDir, name)
  return readFile(filePath, 'utf8')
}

function yuyuteiSellUrl(cardCode: string): string {
  return `https://yuyu-tei.jp/sell/${encodeURIComponent(cardCode)}`
}

export async function yuyuteiFetch(
  cardCode: string,
  options?: { mode?: YuyuteiClientMode; fixturesDir?: string }
): Promise<PriceObservation | null> {
  const mode = options?.mode ?? defaultYuyuteiMode()

  if (mode === 'mock') {
    const fixturesDir = resolveFixturesDir(options?.fixturesDir)
    const html = await readHtmlFixture(fixturesDir, `sell-${encodeURIComponent(cardCode)}.html`)
    const parsed = parseYuyuteiHtml(html)
    if (!parsed) return null
    return {
      source: 'yuyutei',
      currency: 'JPY',
      value: parsed.priceJpy,
      notes: parsed.inStock ? 'in stock' : 'oos'
    }
  }

  const res = await fetch(yuyuteiSellUrl(cardCode), {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!res.ok) return null
  const html = await res.text()
  const parsed = parseYuyuteiHtml(html)
  if (!parsed) return null
  return {
    source: 'yuyutei',
    currency: 'JPY',
    value: parsed.priceJpy,
    notes: parsed.inStock ? 'in stock' : 'oos'
  }
}

