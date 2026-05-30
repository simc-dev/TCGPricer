import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'

import { getEnv } from '../env'

export type SheetsMode = 'mock' | 'live'

export type AppendRowOptions = {
  mode?: SheetsMode | 'auto'
  mockDir?: string
  tabName?: string
}

function hasLiveEnv(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_TAB_NAME &&
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  )
}

function resolveMode(input?: AppendRowOptions): SheetsMode {
  if (input?.mode === 'live') return 'live'
  if (input?.mode === 'mock') return 'mock'
  return hasLiveEnv() ? 'live' : 'mock'
}

function defaultMockDir(): string {
  return path.join(process.cwd(), '.superpowers', 'sheets-mock')
}

async function appendRowMock(values: Array<string | number | null>, options?: AppendRowOptions): Promise<{ updatedRange: string }> {
  const dir = options?.mockDir ?? defaultMockDir()
  await mkdir(dir, { recursive: true })

  const filePath = path.join(dir, 'appends.jsonl')
  const record = {
    ts: new Date().toISOString(),
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? null,
    tabName: options?.tabName ?? process.env.GOOGLE_SHEETS_TAB_NAME ?? null,
    values
  }

  await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8')

  const rel = path.relative(process.cwd(), filePath).split(path.sep).join('/')
  return { updatedRange: `mock:${rel}` }
}

function getAuth() {
  const env = getEnv()
  const json = Buffer.from(env.googleServiceAccountJsonBase64, 'base64').toString('utf8')
  const creds = JSON.parse(json) as { client_email: string; private_key: string }
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
}

async function appendRowLive(values: Array<string | number | null>, options?: AppendRowOptions): Promise<{ updatedRange: string }> {
  const env = getEnv()
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const tabName = options?.tabName ?? env.googleSheetsTabName
  const range = `${tabName}!A1`

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetsSpreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  })

  return { updatedRange: String(res.data.updates?.updatedRange ?? '') }
}

export async function appendRow(values: Array<string | number | null>, options?: AppendRowOptions): Promise<{ updatedRange: string }> {
  const mode = resolveMode(options)
  if (mode === 'mock') return appendRowMock(values, options)
  return appendRowLive(values, options)
}
