import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { appendRow } from './sheets'

describe('appendRow (mock)', () => {
  it('appends a JSONL record to appends.jsonl', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'sheets-mock-'))

    const result = await appendRow(['a', 1, null], { mode: 'mock', mockDir: dir })
    expect(result.updatedRange).toContain('appends.jsonl')

    const content = await readFile(path.join(dir, 'appends.jsonl'), 'utf8')
    const lines = content.split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)

    const record = JSON.parse(lines[0]!) as { values: Array<string | number | null> }
    expect(record.values).toEqual(['a', 1, null])
  })

  it('writes one JSONL line per append', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'sheets-mock-'))

    await appendRow(['first'], { mode: 'mock', mockDir: dir })
    await appendRow(['second'], { mode: 'mock', mockDir: dir })

    const content = await readFile(path.join(dir, 'appends.jsonl'), 'utf8')
    const lines = content.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]!).values).toEqual(['first'])
    expect(JSON.parse(lines[1]!).values).toEqual(['second'])
  })

  it('records tabName when provided', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'sheets-mock-'))

    await appendRow(['a'], { mode: 'mock', mockDir: dir, tabName: 'InventoryLog' })

    const content = await readFile(path.join(dir, 'appends.jsonl'), 'utf8')
    const lines = content.split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!).tabName).toBe('InventoryLog')
  })
})
