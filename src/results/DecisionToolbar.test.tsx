import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../test/renderWizard'
import { exportDecision } from '../domain/serialization'
import type { Factor, Alternative } from '../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const m3: Alternative = { id: 'm3', name: 'Model 3', ratings: { cost: 45 } }

function render() {
  return renderWizard({
    initialPath: '/results',
    decision: { title: 'Car', factors: [cost], alternatives: [m3] },
  })
}

describe('DecisionToolbar — export', () => {
  it('triggers a JSON download of the current decision', async () => {
    const user = userEvent.setup()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'a') el.click = click
      return el
    })

    render()
    await user.click(screen.getByRole('button', { name: /export json/i }))
    expect(click).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})

describe('DecisionToolbar — import (wiring; behaviour covered in ImportDecisionButton)', () => {
  it('offers an import control that loads a decision', async () => {
    const user = userEvent.setup()
    const { store } = render()
    const imported = {
      id: 'imported',
      title: 'House purchase',
      factors: [{ id: 'p', name: 'Price', weight: 3, direction: 'lower-is-better' as const, scale: { kind: '0-100' as const } }],
      alternatives: [{ id: 'h1', name: 'Colonial', ratings: { p: 50 } }],
    }
    const file = new File([exportDecision(imported)], 'import.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(store.getState().decision.title).toBe('House purchase'))
  })
})

describe('DecisionToolbar — report', () => {
  it('navigates to the printable report', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByRole('button', { name: /printable report/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /print \/ save as pdf/i })).toBeInTheDocument(),
    )
  })
})
