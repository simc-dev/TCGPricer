import type { PriceObservation, PricingDecision } from '../types';

function withinDays(iso: string, days: number): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export function selectBenchmark(observations: PriceObservation[]): PricingDecision | null {
  const car = observations.find((o) => o.source === 'carousell');
  if (car && (car.count ?? 0) >= 3 && (car.newestTimestamp ? withinDays(car.newestTimestamp, 30) : false)) {
    return {
      benchmarkSource: 'carousell',
      benchmarkValue: car.value,
      benchmarkCurrency: car.currency,
      benchmarkExplanation: 'Carousell median from >=3 clean listings within 30 days'
    };
  }

  const mercari = observations.find((o) => o.source === 'mercari');
  if (mercari) {
    return {
      benchmarkSource: 'mercari',
      benchmarkValue: mercari.value,
      benchmarkCurrency: mercari.currency,
      benchmarkExplanation: 'Carousell comps insufficient; Mercari fallback'
    };
  }

  const yuyutei = observations.find((o) => o.source === 'yuyutei' && o.notes === 'in stock');
  if (yuyutei) {
    return {
      benchmarkSource: 'yuyutei',
      benchmarkValue: yuyutei.value,
      benchmarkCurrency: yuyutei.currency,
      benchmarkExplanation: 'Mercari unavailable; Yuyutei in-stock fallback'
    };
  }

  const pricecharting = observations.find((o) => o.source === 'pricecharting');
  if (pricecharting) {
    return {
      benchmarkSource: 'pricecharting',
      benchmarkValue: pricecharting.value,
      benchmarkCurrency: pricecharting.currency,
      benchmarkExplanation: 'Last-resort fallback to PriceCharting'
    };
  }

  return null;
}

export function manualApprovalGate(input: { suggestedSgd: number; confidence: number; ambiguity: boolean }): {
  required: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.suggestedSgd > 100) reasons.push('price_gt_100');
  if (input.confidence < 0.9) reasons.push('confidence_lt_0_9');
  if (input.ambiguity) reasons.push('variant_ambiguity');
  return { required: reasons.length > 0, reasons };
}

