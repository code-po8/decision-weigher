import { describe, expect, it, vi } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DecisionStoreProvider } from '../store/DecisionStoreContext'
import { createDecisionStore } from '../store/decisionStore'
import { ReportPage } from './ReportPage'
import { renderWizard } from '../test/renderWizard'
import type { Factor, Alternative } from '../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const quality: Factor = { id: 'q', name: 'Quality', weight: 3, direction: 'higher-is-better', scale: { kind: '0-10' } }
const model3: Alternative = { id: 'm3', name: 'Model 3', ratings: { cost: 45, q: 9 } }
const leaf: Alternative = { id: 'leaf', name: 'Leaf', ratings: { cost: 30, q: 4 } }

function render(decision = { title: 'Which EV?', description: 'EV shortlist', factors: [cost, quality], alternatives: [model3, leaf] }) {
  return renderWizard({ initialPath: '/report', decision })
}

describe('ReportPage', () => {
  it('shows the decision title and description', () => {
    render()
    expect(screen.getByRole('heading', { level: 1, name: 'Which EV?' })).toBeInTheDocument()
    expect(screen.getByText('EV shortlist')).toBeInTheDocument()
  })

  it('recommends the winner with its score and the key factor', () => {
    render()
    const rec = screen.getByText(/ranks highest/i)
    expect(rec).toHaveTextContent('Model 3')
    expect(rec).toHaveTextContent('/10')
    expect(rec).toHaveTextContent(/most influential factor/i)
  })

  it('includes the ranking and the comparison table', () => {
    render()
    expect(screen.getByRole('list', { name: 'Ranking' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    // winner column highlighted in the table
    const winners = screen.getAllByRole('columnheader').filter((th) => th.dataset.winner === 'true')
    expect(winners).toHaveLength(1)
    expect(winners[0]!).toHaveTextContent('Model 3')
  })

  it('calls window.print when the print button is clicked', async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    render()
    await user.click(screen.getByRole('button', { name: /print \/ save as pdf/i }))
    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it('links back to the results view', () => {
    render()
    expect(screen.getByRole('link', { name: /back to results/i })).toHaveAttribute('href', '/results')
  })

  it('redirects to the wizard when the decision is incomplete (no alternatives)', () => {
    // /report has the same guard as results; without an alternative it redirects
    render({ title: 'Car', description: '', factors: [cost], alternatives: [] })
    expect(screen.queryByRole('button', { name: /print \/ save as pdf/i })).not.toBeInTheDocument()
  })

  it('omits the description paragraph when there is none', () => {
    render({ title: 'Trip', description: '', factors: [cost], alternatives: [model3] })
    expect(screen.getByRole('heading', { level: 1, name: 'Trip' })).toBeInTheDocument()
    // no description text rendered
    expect(screen.queryByText('EV shortlist')).not.toBeInTheDocument()
  })

  it('uses a generic heading when the decision has no title (rendered directly)', () => {
    // Reached via the route guard a title always exists, but the component is
    // defensively robust to an empty title.
    const store = createDecisionStore({
      initial: { id: 'd', title: '', factors: [cost], alternatives: [model3] },
    })
    rtlRender(
      <DecisionStoreProvider store={store}>
        <MemoryRouter>
          <ReportPage />
        </MemoryRouter>
      </DecisionStoreProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Decision report' })).toBeInTheDocument()
  })
})
