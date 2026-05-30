import type { Condition } from '../types';
import type { SellRoundingPreset } from '../settings/types';

export function roundToIncrement(value: number, inc: 0.5 | 1): number {
  const units = Math.round(value / inc);
  return Number((units * inc).toFixed(2));
}

export function computeBuyPrice(input: {
  baseSgd: number;
  buylistMultiplier: number;
  rounding: 0.5 | 1;
}): number {
  return roundToIncrement(input.baseSgd * input.buylistMultiplier, input.rounding);
}

function psychRound(value: number, preset: SellRoundingPreset): number {
  if (preset === 'off') return value;
  if (preset === 'conservative') return roundToIncrement(value, 0.5);
  return roundToIncrement(value, 1);
}

export function computeSellPrice(input: {
  baseSgd: number;
  condition: Condition;
  conditionDiscounts?: Record<Condition, number>;
  roundingPreset?: SellRoundingPreset;
}): number {
  const discounts = input.conditionDiscounts ?? { nm: 0, lp: 0.1, mp: 0.2 };
  const discount = typeof discounts[input.condition] === 'number' ? discounts[input.condition] : 0;
  const discounted = input.baseSgd * (1 - discount);
  const rounded = psychRound(discounted, input.roundingPreset ?? 'retail');
  return Number(rounded.toFixed(2));
}
