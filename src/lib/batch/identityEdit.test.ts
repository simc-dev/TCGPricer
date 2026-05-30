import { describe, expect, it } from 'vitest'

import type { CardIdentity } from '../types'

import { applyIdentityEdits, toEditableIdentity } from './identityEdit'

describe('identityEdit', () => {
  const base: CardIdentity = {
    cardCode: 'SV2a-001',
    cardName: 'Pikachu',
    setCode: 'SV2a',
    rarity: 'AR',
    variant: 'standard',
    language: 'ja',
    confidence: 0.95,
    ambiguity: false
  }

  it('converts CardIdentity to editable draft', () => {
    expect(toEditableIdentity(base)).toEqual({
      cardCode: 'SV2a-001',
      cardName: 'Pikachu',
      rarity: 'AR',
      variant: 'standard'
    })
  })

  it('applies edits with trimming and null normalization', () => {
    const edited = applyIdentityEdits(base, { cardCode: ' SV2a-999 ', cardName: '  Raichu ', rarity: '  ', variant: '' })
    expect(edited.cardCode).toBe('SV2a-999')
    expect(edited.cardName).toBe('Raichu')
    expect(edited.rarity).toBeNull()
    expect(edited.variant).toBeNull()
    expect(edited.setCode).toBe('SV2a')
    expect(edited.language).toBe('ja')
  })
})

