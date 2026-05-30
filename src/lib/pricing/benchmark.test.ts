import { describe, expect, it } from 'vitest';

import type { PriceObservation } from '../types';
import { manualApprovalGate, selectBenchmark } from './benchmark';

function obs(partial: Partial<PriceObservation>): PriceObservation {
  return { source: 'mercari', currency: 'JPY', value: 1, ...partial };
}

describe('selectBenchmark', () => {
  it('uses carousell when comps >= 3 and newest within 30 days', () => {
    const newest = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const observations = [obs({ source: 'carousell', currency: 'SGD', value: 100, count: 3, newestTimestamp: newest })];
    const decision = selectBenchmark(observations);
    expect(decision).toEqual({
      benchmarkSource: 'carousell',
      benchmarkValue: 100,
      benchmarkCurrency: 'SGD',
      benchmarkExplanation: 'Carousell median from >=3 clean listings within 30 days'
    });
  });

  it('falls back to mercari when carousell comps are stale', () => {
    const newest = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const observations = [
      obs({ source: 'carousell', currency: 'SGD', value: 100, count: 3, newestTimestamp: newest }),
      obs({ source: 'mercari', currency: 'JPY', value: 1234, count: 5 })
    ];
    const decision = selectBenchmark(observations);
    expect(decision?.benchmarkSource).toBe('mercari');
  });

  it('falls back to yuyutei when mercari is unavailable and yuyutei is in stock', () => {
    const observations = [obs({ source: 'carousell', currency: 'SGD', value: 100, count: 2 }), obs({ source: 'yuyutei', value: 9000, notes: 'in stock' })];
    const decision = selectBenchmark(observations);
    expect(decision?.benchmarkSource).toBe('yuyutei');
  });

  it('falls back to pricecharting when only it is available (or yuyutei is oos)', () => {
    const observations = [obs({ source: 'yuyutei', value: 9000, notes: 'oos' }), obs({ source: 'pricecharting', currency: 'USD', value: 88 })];
    const decision = selectBenchmark(observations);
    expect(decision?.benchmarkSource).toBe('pricecharting');
  });
});

describe('manualApprovalGate', () => {
  it('blocks when price > 100', () => {
    const g = manualApprovalGate({ suggestedSgd: 101, confidence: 1, ambiguity: false });
    expect(g).toEqual({ required: true, reasons: ['price_gt_100'] });
  });

  it('blocks when confidence < 0.9', () => {
    const g = manualApprovalGate({ suggestedSgd: 10, confidence: 0.89, ambiguity: false });
    expect(g).toEqual({ required: true, reasons: ['confidence_lt_0_9'] });
  });

  it('blocks when ambiguity', () => {
    const g = manualApprovalGate({ suggestedSgd: 10, confidence: 1, ambiguity: true });
    expect(g).toEqual({ required: true, reasons: ['variant_ambiguity'] });
  });

  it('accumulates all reasons', () => {
    const g = manualApprovalGate({ suggestedSgd: 100.01, confidence: 0.5, ambiguity: true });
    expect(g.required).toBe(true);
    expect(g.reasons).toEqual(['price_gt_100', 'confidence_lt_0_9', 'variant_ambiguity']);
  });
});

