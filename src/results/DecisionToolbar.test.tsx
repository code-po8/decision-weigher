import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWizard } from '../test/renderWizard'
import { exportDecision } from '../domain/serialization'
import * as decisionFile from './decisionFile'
import type { Factor, Alternative, Decision } from '../domain/types'

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

describe('DecisionToolbar — import', () => {
  it('replaces the decision from a valid imported file', async () => {
    const user = userEvent.setup()
    const { store } = render()

    const imported: Decision = {
      id: 'imported',
      title: 'House purchase',
      factors: [{ id: 'p', name: 'Price', weight: 3, direction: 'lower-is-better', scale: { kind: '0-100' } }],
      alternatives: [{ id: 'h1', name: 'Colonial', ratings: { p: 50 } }],
    }
    const file = new File([exportDecision(imported)], 'import.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(store.getState().decision.title).toBe('House purchase'))
    expect(store.getState().decision.factors[0]!.name).toBe('Price')
  })

  it('the Import JSON button opens the hidden file picker', async () => {
    const user = userEvent.setup()
    render()
    const input = screen.getByLabelText(/import decision file/i)
    const click = vi.spyOn(input, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: /import json/i }))
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()
  })

  it('does nothing when the file picker is dismissed with no file', () => {
    const { store } = render()
    const input = screen.getByLabelText(/import decision file/i)
    // change event with an empty file list (user cancelled the dialog)
    fireEvent.change(input, { target: { files: [] } })
    expect(store.getState().decision.title).toBe('Car') // unchanged, no error
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error and keeps the decision when the file is malformed', async () => {
    const user = userEvent.setup()
    const { store } = render()
    const file = new File(['garbage {'], 'bad.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/import failed/i),
    )
    // original decision untouched
    expect(store.getState().decision.title).toBe('Car')
  })
})

describe('DecisionToolbar — import (non-Error failure)', () => {
  it('shows a generic message when import fails with a non-Error value', async () => {
    const user = userEvent.setup()
    // Force readDecisionFile to reject with a non-Error (defensive branch).
    vi.spyOn(decisionFile, 'readDecisionFile').mockRejectedValue('kaboom')
    const { store } = render()
    const file = new File(['{}'], 'x.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not import that file/i),
    )
    expect(store.getState().decision.title).toBe('Car')
    vi.restoreAllMocks()
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
