import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../../test/renderWizard'
import type { Factor } from '../../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const looks: Factor = { id: 'looks', name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }

// The factors step is reachable once a title exists.
function render(factors: Factor[] = []) {
  return renderWizard({ initialPath: '/factors', decision: { title: 'Car', factors } })
}

// The factor rows live in the list explicitly labelled "Factors" (the wizard
// progress indicator also renders list items, so we always scope to this list).
function factorRows() {
  return within(screen.getByRole('list', { name: 'Factors' })).getAllByRole('listitem')
}

describe('FactorsStep — listing existing factors', () => {
  it('lists each factor with its current values', () => {
    render([cost, looks])
    const rows = factorRows()
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByDisplayValue('Cost')).toBeInTheDocument()
    expect(within(rows[0]!).getByDisplayValue('5')).toBeInTheDocument()
  })

  it('shows an empty-state hint when there are no factors', () => {
    render([])
    expect(screen.getByText(/no factors yet/i)).toBeInTheDocument()
  })
})

describe('FactorsStep — adding a factor', () => {
  it('Add is disabled until a name and a positive weight are provided', async () => {
    const user = userEvent.setup()
    render()
    const add = screen.getByRole('button', { name: /add factor/i })
    expect(add).toBeDisabled()

    await user.type(screen.getByLabelText(/new factor name/i), 'Range')
    // weight defaults to a positive value, so name alone should enable Add
    expect(add).toBeEnabled()
  })

  it('keeps Add disabled for a blank name', async () => {
    const user = userEvent.setup()
    render()
    await user.type(screen.getByLabelText(/new factor name/i), '   ')
    expect(screen.getByRole('button', { name: /add factor/i })).toBeDisabled()
  })

  it('keeps Add disabled for a non-positive weight', async () => {
    const user = userEvent.setup()
    render()
    await user.type(screen.getByLabelText(/new factor name/i), 'Range')
    const weight = screen.getByLabelText(/new factor weight/i)
    await user.clear(weight)
    await user.type(weight, '0')
    expect(screen.getByRole('button', { name: /add factor/i })).toBeDisabled()
  })

  it('adds a factor to the store with the chosen name, weight, direction and scale', async () => {
    const user = userEvent.setup()
    const { store } = render()
    await user.type(screen.getByLabelText(/new factor name/i), 'Range')
    const weight = screen.getByLabelText(/new factor weight/i)
    await user.clear(weight)
    await user.type(weight, '3')
    await user.selectOptions(screen.getByLabelText(/new factor direction/i), 'higher-is-better')
    await user.selectOptions(screen.getByLabelText(/new factor scale/i), '0-100')
    await user.click(screen.getByRole('button', { name: /add factor/i }))

    const factors = store.getState().decision.factors
    expect(factors).toHaveLength(1)
    expect(factors[0]).toMatchObject({
      name: 'Range',
      weight: 3,
      direction: 'higher-is-better',
      scale: { kind: '0-100' },
    })
  })

  it('submitting the add form (Enter) with invalid input adds nothing', async () => {
    const user = userEvent.setup()
    const { store } = render()
    // name is blank → invalid. Pressing Enter in the weight field submits the
    // form, but the submit guard must reject the invalid entry.
    const weight = screen.getByLabelText(/new factor weight/i)
    await user.clear(weight)
    await user.type(weight, '2{Enter}')
    expect(store.getState().decision.factors).toHaveLength(0)
  })

  it('clears the add form after a successful add', async () => {
    const user = userEvent.setup()
    render()
    await user.type(screen.getByLabelText(/new factor name/i), 'Range')
    await user.click(screen.getByRole('button', { name: /add factor/i }))
    expect(screen.getByLabelText(/new factor name/i)).toHaveValue('')
  })
})

describe('FactorsStep — editing a factor', () => {
  it('renames a factor in the store', async () => {
    const user = userEvent.setup()
    const { store } = render([cost])
    const nameField = screen.getByDisplayValue('Cost')
    await user.clear(nameField)
    await user.type(nameField, 'Total cost')
    expect(store.getState().decision.factors[0]!.name).toBe('Total cost')
  })

  it('updates a factor weight in the store', async () => {
    const user = userEvent.setup()
    const { store } = render([cost])
    const weightField = screen.getByDisplayValue('5')
    await user.clear(weightField)
    await user.type(weightField, '8')
    expect(store.getState().decision.factors[0]!.weight).toBe(8)
  })

  it('does not crash or corrupt state while the weight field is temporarily empty', async () => {
    const user = userEvent.setup()
    const { store } = render([cost])
    const weightField = screen.getByDisplayValue('5')
    await user.clear(weightField) // intermediate empty value must not throw
    // store keeps the last valid weight until a new valid one is entered
    expect(store.getState().decision.factors[0]!.weight).toBe(5)
    await user.type(weightField, '6')
    expect(store.getState().decision.factors[0]!.weight).toBe(6)
  })

  it('ignores an invalid (zero) weight edit, keeping the previous value', async () => {
    const user = userEvent.setup()
    const { store } = render([cost])
    const weightField = screen.getByDisplayValue('5')
    await user.clear(weightField)
    await user.type(weightField, '0')
    // 0 is invalid; the store must still hold the last valid weight
    expect(store.getState().decision.factors[0]!.weight).toBe(5)
  })

  it('changes a factor direction and scale in the store', async () => {
    const user = userEvent.setup()
    const { store } = render([cost])
    const row = factorRows()[0]!
    await user.selectOptions(within(row).getByLabelText(/direction/i), 'higher-is-better')
    await user.selectOptions(within(row).getByLabelText(/scale/i), 'boolean')
    const f = store.getState().decision.factors[0]!
    expect(f.direction).toBe('higher-is-better')
    expect(f.scale).toEqual({ kind: 'boolean' })
  })

  it('removes a factor', async () => {
    const user = userEvent.setup()
    const { store } = render([cost, looks])
    const row = factorRows()[0]!
    await user.click(within(row).getByRole('button', { name: /remove/i }))
    expect(store.getState().decision.factors.map((f) => f.name)).toEqual(['Looks'])
  })
})

describe('FactorsStep — advancing', () => {
  it('enables Next once at least one factor exists', async () => {
    const user = userEvent.setup()
    render()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(screen.getByLabelText(/new factor name/i), 'Range')
    await user.click(screen.getByRole('button', { name: /add factor/i }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })
})
