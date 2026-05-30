export type PricingMode = 'buy' | 'sell';
export type CardVariant = 'standard' | 'parallel';
export type CardLanguage = 'ja' | 'en' | 'unknown';
export type Condition = 'nm' | 'lp' | 'mp';

export type CardIdentity = {
  cardCode: string;
  cardName: string;
  setCode: string | null;
  rarity: string | null;
  variant: CardVariant | null;
  language: CardLanguage;
  confidence: number;
  ambiguity: boolean;
};

export type PriceSource = 'carousell' | 'mercari' | 'pricecharting' | 'yuyutei';
export type Currency = 'SGD' | 'JPY' | 'USD';

export type PriceObservation = {
  source: PriceSource;
  currency: Currency;
  value: number;
  count?: number;
  newestTimestamp?: string;
  notes?: string;
};

export type BenchmarkSource = PriceSource;

export type PricingDecision = {
  benchmarkSource: BenchmarkSource;
  benchmarkValue: number;
  benchmarkCurrency: Currency;
  benchmarkExplanation: string;
};

export type PricingInputs = {
  fxJpyToSgd: number;
  buylistMultiplier: number;
  buyRounding: 0.5 | 1;
  condition: Condition | null;
};

export type SuggestedPrices = {
  buy: number | null;
  sell: number | null;
};

export type QuoteResponse = {
  identity: CardIdentity;
  fxJpyToSgd: number;
  observations: PriceObservation[];
  decision: PricingDecision | null;
  suggested: SuggestedPrices;
  manualApprovalRequired: boolean;
  manualApprovalReasons: string[];
  notes: string;
};
