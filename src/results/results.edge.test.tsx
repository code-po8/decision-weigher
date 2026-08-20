import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DecisionStoreProvider } from '../store/DecisionStoreContext'
import { createDecisionStore } from '../store/decisionStore'
import { SensitivityHint } from './SensitivityHint'
import { ContributionBreakdown } from './ContributionBreakdown'
import type { Decision } from '../domain/types'

function renderWith(component: React.ReactNode, decision: Partial<Decision>) {
  const store = createDecisionStore({
    initial: { id: 'd', title: 'D', factors: [], alternatives: [], ...decision },
  })
  return render(<DecisionStoreProvider store={store}>{component}</DecisionStoreProvider>)
}

describe('SensitivityHint edge cases', () => {
  it('prompts to add factors when there are none', () => {
    renderWith(<SensitivityHint />, { factors: [], alternatives: [] })
    expect(screen.getByText(/add factors to see a sensitivity analysis/i)).toBeInTheDocument()
  })

  it('reports a robust ranking when no factor changes the order', () => {
    // one factor, one alternative → nothing can reshuffle
    renderWith(<SensitivityHint />, {
      factors: [{ id: 'a', name: 'A', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }],
      alternatives: [{ id: 'x', name: 'X', ratings: { a: 5 } }],
    })
    expect(screen.getByText(/ranking is robust/i)).toBeInTheDocument()
  })

  it('notes a reshuffle when the most influential factor moves the middle', () => {
    // top always wins; muting "flat" reorders low/mid (movement > 0, winner stays)
    renderWith(<SensitivityHint />, {
      factors: [
        { id: 'swing', name: 'Swing', weight: 4, direction: 'higher-is-better', scale: { kind: '0-10' } },
        { id: 'flat', name: 'Flat', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } },
      ],
      alternatives: [
        { id: 'top', name: 'top', ratings: { swing: 10, flat: 10 } },
        { id: 'mid', name: 'mid', ratings: { swing: 6, flat: 1 } },
        { id: 'low', name: 'low', ratings: { swing: 5, flat: 9 } },
      ],
    })
    expect(screen.getByText(/reshuffles the middle/i)).toBeInTheDocument()
  })

  it('says a different alternative would win when the top factor is decisive', () => {
    renderWith(<SensitivityHint />, {
      factors: [
        { id: 'cost', name: 'Cost', weight: 10, direction: 'lower-is-better', scale: { kind: '0-100' } },
        { id: 'q', name: 'Quality', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } },
      ],
      alternatives: [
        { id: 'cheap', name: 'cheap', ratings: { cost: 10, q: 2 } },
        { id: 'premium', name: 'premium', ratings: { cost: 90, q: 10 } },
      ],
    })
    expect(screen.getByText(/a different\s+alternative would win/i)).toBeInTheDocument()
  })
})

describe('ContributionBreakdown edge cases', () => {
  it('renders zero-width segments when an alternative has no ratings (total weighted 0)', () => {
    renderWith(<ContributionBreakdown />, {
      factors: [{ id: 'a', name: 'A', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }],
      alternatives: [{ id: 'x', name: 'X', ratings: {} }],
    })
    // The bar renders without throwing; the breakdown image is present.
    expect(screen.getByLabelText(/Contribution breakdown for X/)).toBeInTheDocument()
  })

  it('cycles the palette when there are more factors than colours', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `f${i}`,
      name: `F${i}`,
      weight: 1,
      direction: 'higher-is-better' as const,
      scale: { kind: '0-10' as const },
    }))
    renderWith(<ContributionBreakdown />, {
      factors: many,
      alternatives: [{ id: 'x', name: 'X', ratings: Object.fromEntries(many.map((f) => [f.id, 5])) }],
    })
    // 7 legend items (palette has 6 → wraps around)
    expect(within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem')).toHaveLength(7)
  })
})
