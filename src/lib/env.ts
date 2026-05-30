export type Env = {
  openRouterApiKey: string;
  apifyToken: string;
  apifyCarousellActorId: string;
  apifyMercariActorId: string;
  priceChartingToken: string;
  googleSheetsSpreadsheetId: string;
  googleSheetsTabName: string;
  googleServiceAccountJsonBase64: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getEnv(): Env {
  if (typeof window !== 'undefined') throw new Error('getEnv is server-only');
  return {
    openRouterApiKey: requireEnv('OPEN_ROUTER_API_KEY'),
    apifyToken: requireEnv('APIFY_TOKEN'),
    apifyCarousellActorId: requireEnv('APIFY_CAROUSELL_ACTOR_ID'),
    apifyMercariActorId: requireEnv('APIFY_MERCARI_ACTOR_ID'),
    priceChartingToken: requireEnv('PRICECHARTING_TOKEN'),
    googleSheetsSpreadsheetId: requireEnv('GOOGLE_SHEETS_SPREADSHEET_ID'),
    googleSheetsTabName: requireEnv('GOOGLE_SHEETS_TAB_NAME'),
    googleServiceAccountJsonBase64: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64')
  };
}
