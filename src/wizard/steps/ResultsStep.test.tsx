import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../../test/renderWizard'
import type { Factor, Alternative } from '../../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const quality: Factor = { id: 'q', name: 'Quality', weight: 3, direction: 'higher-is-better', scale: { kind: '0-10' } }
const nacs: Factor = { id: 'nacs', name: 'NACS', weight: 2, direction: 'higher-is-better', scale: { kind: 'boolean' } }

const model3: Alternative = { id: 'm3', name: 'Model 3', ratings: { cost: 45, q: 9, nacs: 1 } }
const leaf: Alternative = { id: 'leaf', name: 'Leaf', ratings: { cost: 30, q: 4, nacs: 0 } }

// Results is reachable with title + factor(s) + alternative(s).
function render(factors: Factor[] = [cost, quality, nacs], alternatives: Alternative[] = [model3, leaf]) {
  return renderWizard({ initialPath: '/results', decision: { title: 'Car', factors, alternatives } })
}

describe('ResultsStep — tabs', () => {
  it('shows four tabs and the ranking tab by default', () => {
    render()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Ranking',
      'Breakdown',
      'Sensitivity',
      'Comparison',
    ])
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('list', { name: 'Ranking' })).toBeInTheDocument()
  })

  it('switches to the Breakdown tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('tab', { name: 'Breakdown' }))
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/Contribution breakdown for Model 3/)).toBeInTheDocument()
  })

  it('switches to the Sensitivity tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('tab', { name: 'Sensitivity' }))
    expect(screen.getByText(/most influential factor/i)).toBeInTheDocument()
  })

  it('switches to the Comparison tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('tab', { name: 'Comparison' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('RankedList', () => {
  it('lists alternatives best to worst with a winner badge', () => {
    render()
    const items = within(screen.getByRole('list', { name: 'Ranking' })).getAllByRole('listitem')
    // Model 3 (better on quality + NACS) should outrank Leaf
    expect(within(items[0]!).getByText('Model 3')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Winner')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Leaf')).toBeInTheDocument()
    expect(within(items[1]!).queryByText('Winner')).not.toBeInTheDocument()
  })
})

describe('ComparisonTable', () => {
  it('renders a row per factor and highlights the winning column', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('tab', { name: 'Comparison' }))
    // one header cell marked as the winner
    const winners = screen.getAllByRole('columnheader').filter((th) => th.dataset.winner === 'true')
    expect(winners).toHaveLength(1)
    expect(winners[0]!).toHaveTextContent('Model 3')
    // boolean factor renders Yes/No
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('shows an em dash for a missing rating', async () => {
    const user = userEvent.setup()
    render([cost], [{ id: 'm3', name: 'Model 3', ratings: {} }])
    await user.click(screen.getByRole('tab', { name: 'Comparison' }))
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('SensitivityHint', () => {
  it('names the most influential factor', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('tab', { name: 'Sensitivity' }))
    expect(screen.getByText(/most influential factor/i)).toBeInTheDocument()
  })
})
