import { NextResponse } from 'next/server'

import { appendRow } from '@/lib/google/sheets'

export const runtime = 'nodejs'

type AppendRequest = {
  values: Array<string | number | null>
  tabName?: string
}

function toAppendRequest(value: unknown): AppendRequest | null {
  const v = value as Record<string, unknown> | null
  const values = v?.values
  if (!Array.isArray(values)) return null
  for (const it of values) {
    if (it === null) continue
    if (typeof it === 'string') continue
    if (typeof it === 'number') continue
    return null
  }
  const tabName = v?.tabName
  if (tabName !== undefined) {
    if (typeof tabName !== 'string') return null
    if (!tabName.trim()) return null
  }
  return { values: values as Array<string | number | null>, tabName: tabName as string | undefined }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const body = toAppendRequest(json)
  if (!body) return NextResponse.json({ error: 'values must be an array of string|number|null' }, { status: 400 })
  const result = await appendRow(body.values, body.tabName ? { tabName: body.tabName } : undefined)
  return NextResponse.json(result)
}
