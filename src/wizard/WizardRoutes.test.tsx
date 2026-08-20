import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { renderWizard } from '../test/renderWizard'
import type { Factor, Alternative } from '../domain/types'

const factor: Factor = { id: 'f', name: 'Cost', weight: 1, direction: 'lower-is-better', scale: { kind: '0-100' } }
const alt: Alternative = { id: 'a', name: 'Model 3', ratings: {} }

const complete = { title: 'Car', factors: [factor], alternatives: [alt] }

describe('WizardRoutes — rendering each reachable step', () => {
  it('renders the decision step at /', () => {
    renderWizard({ initialPath: '/' })
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
  })

  it('renders the factors step at /factors when reachable', () => {
    renderWizard({ initialPath: '/factors', decision: { title: 'Car' } })
    expect(screen.getByTestId('step-factors')).toBeInTheDocument()
  })

  it('renders the alternatives step when reachable', () => {
    renderWizard({ initialPath: '/alternatives', decision: { title: 'Car', factors: [factor] } })
    expect(screen.getByTestId('step-alternatives')).toBeInTheDocument()
  })

  it('renders the results step when reachable', () => {
    renderWizard({ initialPath: '/results', decision: complete })
    expect(screen.getByTestId('step-results')).toBeInTheDocument()
  })

  it('redirects an unknown route to the decision step', () => {
    renderWizard({ initialPath: '/nope' })
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
  })
})

describe('StepGuard — redirects premature access', () => {
  it('redirects /factors to decision when there is no title', () => {
    renderWizard({ initialPath: '/factors', decision: { title: '' } })
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
    expect(screen.queryByTestId('step-factors')).not.toBeInTheDocument()
  })

  it('redirects /alternatives to factors when there are no factors', () => {
    renderWizard({ initialPath: '/alternatives', decision: { title: 'Car' } })
    expect(screen.getByTestId('step-factors')).toBeInTheDocument()
  })

  it('redirects /results back to the furthest reachable step', () => {
    // has title + factor but no alternative → furthest is alternatives
    renderWizard({ initialPath: '/results', decision: { title: 'Car', factors: [factor] } })
    expect(screen.getByTestId('step-alternatives')).toBeInTheDocument()
    expect(screen.queryByTestId('step-results')).not.toBeInTheDocument()
  })
})

describe('WizardLayout — Back/Next navigation', () => {
  it('Back is disabled on the first step', () => {
    renderWizard({ initialPath: '/' })
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('Next is disabled until the step requirement is met, then enabled', async () => {
    const { store } = renderWizard({ initialPath: '/' })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    act(() => store.getState().setTitle('Car'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
  })

  it('Next advances to the following step', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/', decision: { title: 'Car' } })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('step-factors')).toBeInTheDocument()
  })

  it('Back returns to the previous step', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/factors', decision: { title: 'Car' } })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
  })

  it('the results (terminal) step has no Next button', () => {
    renderWizard({ initialPath: '/results', decision: complete })
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })
})

describe('WizardProgress', () => {
  it('marks the current step with aria-current', () => {
    renderWizard({ initialPath: '/', decision: { title: 'Car' } })
    const current = screen.getByText(/1\. Decision/)
    expect(current).toHaveAttribute('aria-current', 'step')
  })

  it('renders a locked step as a non-link (no navigation)', () => {
    renderWizard({ initialPath: '/' })
    // Results is locked with an empty decision → it is a span, not a link
    const results = screen.getByText(/4\. Results/)
    expect(results.closest('a')).toBeNull()
    expect(results).toHaveAttribute('aria-disabled', 'true')
  })

  it('lets you jump back to a completed step via its progress link', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/alternatives', decision: { title: 'Car', factors: [factor] } })
    // Decision is completed and reachable → clicking its link navigates there
    const decisionLink = screen.getByText(/1\. Decision/)
    expect(decisionLink.closest('a')).not.toBeNull()
    await user.click(decisionLink)
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
  })
})
