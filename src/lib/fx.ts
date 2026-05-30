const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000

let cachedJpyToSgdRate: { rate: number; fetchedAtMs: number } | null = null
let inFlightJpyToSgdRate: Promise<number> | null = null

export function clearJpyToSgdRateCache(): void {
  cachedJpyToSgdRate = null
  inFlightJpyToSgdRate = null
}

export async function getJpyToSgdRate(input?: {
  ttlMs?: number
  now?: () => number
  forceRefresh?: boolean
}): Promise<number> {
  const now = input?.now ?? (() => Date.now())
  const ttlMs = input?.ttlMs ?? DEFAULT_TTL_MS
  const forceRefresh = input?.forceRefresh ?? false

  const cached = cachedJpyToSgdRate
  if (!forceRefresh && cached && now() - cached.fetchedAtMs < ttlMs) return cached.rate

  const inFlight = inFlightJpyToSgdRate
  if (!forceRefresh && inFlight) return inFlight

  const p = (async () => {
    const url = 'https://api.exchangerate.host/latest?base=JPY&symbols=SGD'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`FX fetch failed: ${res.status} ${res.statusText}`)

    const json = (await res.json()) as unknown
    const obj = json as { rates?: { SGD?: unknown } } | null
    const rate = Number(obj?.rates?.SGD ?? NaN)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('FX parse failed: missing JPY->SGD rate')

    cachedJpyToSgdRate = { rate, fetchedAtMs: now() }
    return rate
  })()

  inFlightJpyToSgdRate = p
  try {
    return await p
  } finally {
    if (inFlightJpyToSgdRate === p) inFlightJpyToSgdRate = null
  }
}
