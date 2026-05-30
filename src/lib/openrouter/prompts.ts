export const VISION_EXTRACT_SYSTEM = `You extract a trading card identity from a photo.
Return strict JSON only.`

export function visionExtractUserPrompt(): string {
  return `Return JSON with keys:
cardCode (string), cardName (string), setCode (string|null), rarity (string|null),
language ("ja"|"en"|"unknown"), confidence (number 0..1), ambiguity (boolean).`
}

export const CAROUSELL_PARSE_SYSTEM = `You extract the real SGD selling price from listing text.
Ignore bait placeholders like 1 or 9999 when evidence suggests otherwise. Return strict JSON only.`

export function carousellParseUserPrompt(listingText: string): string {
  return `Listing text:
${listingText}

Return JSON: { "priceSgd": number|null, "isBait": boolean, "reason": string }`
}
