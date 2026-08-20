import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../../test/renderWizard'

describe('DecisionStep', () => {
  it('offers to restore a saved decision on the first (landing) step', () => {
    renderWizard({ initialPath: '/' })
    expect(
      screen.getByRole('button', { name: /restore a saved decision/i }),
    ).toBeInTheDocument()
    // the hidden file input is present so a returning user can import immediately
    expect(screen.getByLabelText(/import decision file/i)).toBeInTheDocument()
  })

  it('renders a required title field and an optional description field', () => {
    renderWizard({ initialPath: '/' })
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    // title is marked required
    expect(screen.getByLabelText(/title/i)).toBeRequired()
  })

  it('pre-fills the fields from the store', () => {
    renderWizard({ initialPath: '/', decision: { title: 'Buy a car', description: 'EV shortlist' } })
    expect(screen.getByLabelText(/title/i)).toHaveValue('Buy a car')
    expect(screen.getByLabelText(/description/i)).toHaveValue('EV shortlist')
  })

  it('writes the title to the store as the user types', async () => {
    const user = userEvent.setup()
    const { store } = renderWizard({ initialPath: '/' })
    await user.type(screen.getByLabelText(/title/i), 'Choose a car')
    expect(store.getState().decision.title).toBe('Choose a car')
  })

  it('writes the description to the store', async () => {
    const user = userEvent.setup()
    const { store } = renderWizard({ initialPath: '/' })
    await user.type(screen.getByLabelText(/description/i), 'EV shortlist')
    expect(store.getState().decision.description).toBe('EV shortlist')
  })

  it('enables Next once a non-blank title is entered', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/' })
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()
    await user.type(screen.getByLabelText(/title/i), 'Car')
    expect(next).toBeEnabled()
  })

  it('keeps Next disabled for a whitespace-only title', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/' })
    await user.type(screen.getByLabelText(/title/i), '   ')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('description is optional (Next enabled with title only, no description)', async () => {
    const user = userEvent.setup()
    renderWizard({ initialPath: '/' })
    await user.type(screen.getByLabelText(/title/i), 'Car')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
  })
})
