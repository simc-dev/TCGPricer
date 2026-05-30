import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type ApifyClientMode = 'live' | 'mock'

function defaultApifyMode(): ApifyClientMode {
  if (process.env.APIFY_MODE === 'mock') return 'mock'
  if (process.env.APIFY_OFFLINE === '1') return 'mock'
  if (process.env.VITEST) return 'mock'
  return 'live'
}

function requireApifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('Missing env: APIFY_TOKEN')
  return token
}

function resolveFixturesDir(fixturesDir?: string): string {
  return (
    fixturesDir ??
    process.env.APIFY_FIXTURES_DIR ??
    path.join(process.cwd(), 'src', 'lib', 'apify', '__fixtures__')
  )
}

async function readJsonFixture(fixturesDir: string, name: string): Promise<unknown> {
  const filePath = path.join(fixturesDir, name)
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as unknown
}

export async function apifyRunActor(input: {
  actorId: string
  runInput: unknown
  mode?: ApifyClientMode
  fixturesDir?: string
}): Promise<unknown> {
  const mode = input.mode ?? defaultApifyMode()

  if (mode === 'mock') {
    const fixturesDir = resolveFixturesDir(input.fixturesDir)
    return readJsonFixture(fixturesDir, `runActor-${encodeURIComponent(input.actorId)}.json`)
  }

  const token = requireApifyToken()
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(input.actorId)}/runs?token=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.runInput)
  })
  if (!res.ok) throw new Error(`Apify run failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as unknown
}

export async function apifyGetDatasetItems(input: {
  datasetId: string
  limit: number
  mode?: ApifyClientMode
  fixturesDir?: string
}): Promise<unknown[]> {
  const mode = input.mode ?? defaultApifyMode()

  if (mode === 'mock') {
    const fixturesDir = resolveFixturesDir(input.fixturesDir)
    const items = (await readJsonFixture(
      fixturesDir,
      `datasetItems-${encodeURIComponent(input.datasetId)}.json`
    )) as unknown
    if (!Array.isArray(items)) throw new Error('Apify fixture is not an array')
    return items.slice(0, input.limit)
  }

  const token = requireApifyToken()
  const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(input.datasetId)}/items?clean=true&limit=${input.limit}&token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as unknown[]
}
