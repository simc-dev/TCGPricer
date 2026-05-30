import type { CardIdentity } from '../types'

export type EditableIdentity = {
  cardCode: string
  cardName: string
  rarity: string
  variant: '' | 'standard' | 'parallel'
}

export function toEditableIdentity(identity: CardIdentity): EditableIdentity {
  return {
    cardCode: identity.cardCode ?? '',
    cardName: identity.cardName ?? '',
    rarity: identity.rarity ?? '',
    variant: identity.variant ?? ''
  }
}

export function applyIdentityEdits(identity: CardIdentity, edits: EditableIdentity): CardIdentity {
  const rarity = edits.rarity.trim()
  return {
    ...identity,
    cardCode: edits.cardCode.trim(),
    cardName: edits.cardName.trim(),
    rarity: rarity.length > 0 ? rarity : null,
    variant: edits.variant === 'standard' || edits.variant === 'parallel' ? edits.variant : null
  }
}

