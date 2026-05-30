import { describe, expect, it } from 'vitest';
import { computeBuyPrice, computeSellPrice, roundToIncrement } from './math';

describe('roundToIncrement', () => {
  it('rounds to nearest 0.5', () => {
    expect(roundToIncrement(1.24, 0.5)).toBe(1);
    expect(roundToIncrement(1.25, 0.5)).toBe(1.5);
    expect(roundToIncrement(1.74, 0.5)).toBe(1.5);
    expect(roundToIncrement(1.75, 0.5)).toBe(2);
  });

  it('rounds to nearest 1.0', () => {
    expect(roundToIncrement(18.3, 1)).toBe(18);
    expect(roundToIncrement(18.5, 1)).toBe(19);
  });
});

describe('computeBuyPrice', () => {
  it('applies buylist multiplier and rounds', () => {
    expect(computeBuyPrice({ baseSgd: 10, buylistMultiplier: 0.6, rounding: 0.5 })).toBe(6);
    expect(computeBuyPrice({ baseSgd: 10, buylistMultiplier: 0.65, rounding: 1 })).toBe(7);
  });
});

describe('computeSellPrice', () => {
  it('applies condition discount and rounding preset defaults', () => {
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'nm' })).toBe(18);
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'lp' })).toBe(16);
    expect(computeSellPrice({ baseSgd: 18.3, condition: 'mp' })).toBe(15);
  });
});

describe('computeSellPrice rounding presets', () => {
  it('retail rounds to nearest 1', () => {
    expect(computeSellPrice({ baseSgd: 10.4, condition: 'nm', roundingPreset: 'retail' })).toBe(10);
    expect(computeSellPrice({ baseSgd: 10.6, condition: 'nm', roundingPreset: 'retail' })).toBe(11);
  });

  it('conservative rounds to nearest 0.5', () => {
    expect(computeSellPrice({ baseSgd: 10.24, condition: 'nm', roundingPreset: 'conservative' })).toBe(10);
    expect(computeSellPrice({ baseSgd: 10.26, condition: 'nm', roundingPreset: 'conservative' })).toBe(10.5);
  });

  it('applies custom condition discounts', () => {
    const v = computeSellPrice({
      baseSgd: 100,
      condition: 'lp',
      conditionDiscounts: { nm: 0, lp: 0.2, mp: 0.3 },
      roundingPreset: 'off',
    });
    expect(v).toBe(80);
  });
});
