import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../../test/renderWizard'
import type { Factor, Alternative } from '../../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const nacs: Factor = { id: 'nacs', name: 'NACS', weight: 2, direction: 'higher-is-better', scale: { kind: 'boolean' } }
const quality: Factor = { id: 'q', name: 'Quality', weight: 3, direction: 'higher-is-better', scale: { kind: '0-10' } }

const m3: Alternative = { id: 'm3', name: 'Model 3', ratings: {} }

// Reachable once title + at least one factor exist.
function render(factors: Factor[] = [cost], alternatives: Alternative[] = []) {
  return renderWizard({
    initialPath: '/alternatives',
    decision: { title: 'Car', factors, alternatives },
  })
}

function altCards() {
  return within(screen.getByRole('list', { name: 'Alternatives' })).getAllByRole('listitem')
}

describe('AlternativesStep — listing & adding', () => {
  it('shows an empty-state hint when there are no alternatives', () => {
    render()
    expect(screen.getByText(/no alternatives yet/i)).toBeInTheDocument()
  })

  it('Add is disabled until a name is provided', async () => {
    const user = userEvent.setup()
    render()
    const add = screen.getByRole('button', { name: /add alternative/i })
    expect(add).toBeDisabled()
    await user.type(screen.getByLabelText(/new alternative name/i), 'Leaf')
    expect(add).toBeEnabled()
  })

  it('adds an alternative with empty ratings and clears the form', async () => {
    const user = userEvent.setup()
    const { store } = render()
    await user.type(screen.getByLabelText(/new alternative name/i), 'Leaf')
    await user.click(screen.getByRole('button', { name: /add alternative/i }))
    expect(store.getState().decision.alternatives).toHaveLength(1)
    expect(store.getState().decision.alternatives[0]).toMatchObject({ name: 'Leaf', ratings: {} })
    expect(screen.getByLabelText(/new alternative name/i)).toHaveValue('')
  })

  it('renames an alternative', async () => {
    const user = userEvent.setup()
    const { store } = render([cost], [m3])
    const nameField = screen.getByDisplayValue('Model 3')
    await user.clear(nameField)
    await user.type(nameField, 'Tesla Model 3')
    expect(store.getState().decision.alternatives[0]!.name).toBe('Tesla Model 3')
  })

  it('removes an alternative', async () => {
    const user = userEvent.setup()
    const { store } = render([cost], [m3, { id: 'leaf', name: 'Leaf', ratings: {} }])
    const card = altCards()[0]!
    await user.click(within(card).getByRole('button', { name: /remove Model 3/i }))
    expect(store.getState().decision.alternatives.map((a) => a.name)).toEqual(['Leaf'])
  })
})

describe('AlternativesStep — rating numeric factors', () => {
  it('renders one rating input per factor for each alternative', () => {
    render([cost, quality], [m3])
    const card = altCards()[0]!
    expect(within(card).getByLabelText(/Cost/)).toBeInTheDocument()
    expect(within(card).getByLabelText(/Quality/)).toBeInTheDocument()
  })

  it('writes a decimal rating to the store', async () => {
    const user = userEvent.setup()
    const { store } = render([quality], [m3])
    const card = altCards()[0]!
    const input = within(card).getByLabelText(/Quality/)
    await user.type(input, '7.5')
    expect(store.getState().decision.alternatives[0]!.ratings.q).toBe(7.5)
  })

  it('never commits an out-of-range rating (stays within the scale max)', async () => {
    const user = userEvent.setup()
    const { store } = render([quality], [{ id: 'm3', name: 'Model 3', ratings: { q: 5 } }])
    const card = altCards()[0]!
    const input = within(card).getByLabelText(/Quality/)
    await user.clear(input)
    await user.type(input, '99') // final value above the 0-10 scale max
    // The final "99" is rejected; whatever is committed must be within [0, 10].
    const q = store.getState().decision.alternatives[0]!.ratings.q
    expect(q).toBeLessThanOrEqual(10)
    expect(q).not.toBe(99)
  })

  it('clearing a rating input removes it from the store', async () => {
    const user = userEvent.setup()
    const { store } = render([quality], [{ id: 'm3', name: 'Model 3', ratings: { q: 5 } }])
    const card = altCards()[0]!
    await user.clear(within(card).getByLabelText(/Quality/))
    expect(store.getState().decision.alternatives[0]!.ratings.q).toBeUndefined()
  })

  it('respects each factor scale max (0-100 accepts 80)', async () => {
    const user = userEvent.setup()
    const { store } = render([cost], [m3])
    const card = altCards()[0]!
    await user.type(within(card).getByLabelText(/Cost/), '80')
    expect(store.getState().decision.alternatives[0]!.ratings.cost).toBe(80)
  })
})

describe('AlternativesStep — rating boolean factors', () => {
  it('renders a checkbox for a boolean factor and stores 1 when checked', async () => {
    const user = userEvent.setup()
    const { store } = render([nacs], [m3])
    const card = altCards()[0]!
    const checkbox = within(card).getByRole('checkbox', { name: /NACS/ })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(store.getState().decision.alternatives[0]!.ratings.nacs).toBe(1)
  })

  it('stores 0 when a boolean factor is unchecked again', async () => {
    const user = userEvent.setup()
    const { store } = render([nacs], [{ id: 'm3', name: 'Model 3', ratings: { nacs: 1 } }])
    const card = altCards()[0]!
    const checkbox = within(card).getByRole('checkbox', { name: /NACS/ })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(store.getState().decision.alternatives[0]!.ratings.nacs).toBe(0)
  })
})

describe('AlternativesStep — advancing', () => {
  it('enables Next once at least one alternative exists', async () => {
    const user = userEvent.setup()
    render()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(screen.getByLabelText(/new alternative name/i), 'Leaf')
    await user.click(screen.getByRole('button', { name: /add alternative/i }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })
})
