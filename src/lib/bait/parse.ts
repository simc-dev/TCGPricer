export function extractSgdCandidates(text: string): number[] {
  const matches = text.match(/\$?\s?(\d{1,5})(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches
    .map((m) => Number(m.replace(/[^\d.]/g, '')))
    .filter((n) => Number.isFinite(n));
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

