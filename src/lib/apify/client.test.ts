import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { apifyGetDatasetItems, apifyRunActor } from './client'

describe('apify client (mock mode)', () => {
  it('loads run response from fixture without requiring token', async () => {
    const before = process.env.APIFY_TOKEN
    delete process.env.APIFY_TOKEN
    try {
      const fixturesDir = path.join(process.cwd(), 'src', 'lib', 'apify', '__fixtures__')
      const json = await apifyRunActor({
        actorId: 'test~carousell',
        runInput: { q: 'ignored' },
        mode: 'mock',
        fixturesDir
      })

      expect(json).toEqual({
        data: { id: 'run_001', status: 'SUCCEEDED', defaultDatasetId: 'dataset-123' }
      })
    } finally {
      if (before === undefined) delete process.env.APIFY_TOKEN
      else process.env.APIFY_TOKEN = before
    }
  })

  it('loads dataset items from fixture and applies limit', async () => {
    const fixturesDir = path.join(process.cwd(), 'src', 'lib', 'apify', '__fixtures__')
    const items = await apifyGetDatasetItems({
      datasetId: 'dataset-123',
      limit: 2,
      mode: 'mock',
      fixturesDir
    })

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ id: 'a' })
    expect(items[1]).toMatchObject({ id: 'b' })
  })
})
