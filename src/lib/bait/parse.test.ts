import { describe, expect, it } from 'vitest';
import { extractSgdCandidates, median } from './parse';

describe('extractSgdCandidates', () => {
  it('extracts SGD numeric candidates', () => {
    expect(extractSgdCandidates('Selling for $120, meetup only')).toEqual([120]);
    expect(extractSgdCandidates('$1 placeholder, actual 85')).toEqual([1, 85]);
  });
});

describe('median', () => {
  it('computes median for odd/even counts', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

