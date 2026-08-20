import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { DecisionStoreProvider } from '../store/DecisionStoreContext'
import { createDecisionStore } from '../store/decisionStore'
import { ImportDecisionButton } from './ImportDecisionButton'
import { exportDecision } from '../domain/serialization'
import * as decisionFile from './decisionFile'
import type { Decision } from '../domain/types'

// Renders the button plus a location probe, so we can assert where an import
// navigates. Starts at '/', with routes that just echo the current path.
function renderButton() {
  const store = createDecisionStore({
    initial: { id: 'd', title: '', factors: [], alternatives: [] },
  })
  function Probe() {
    return <div data-testid="path">{useLocation().pathname}</div>
  }
  const utils = render(
    <DecisionStoreProvider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <ImportDecisionButton />
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </DecisionStoreProvider>,
  )
  return { store, ...utils }
}

const complete: Decision = {
  id: 'imported',
  title: 'House purchase',
  factors: [{ id: 'p', name: 'Price', weight: 3, direction: 'lower-is-better', scale: { kind: '0-100' } }],
  alternatives: [{ id: 'h1', name: 'Colonial', ratings: { p: 50 } }],
}

describe('ImportDecisionButton', () => {
  it('uses "Import JSON" as the default label', () => {
    renderButton()
    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument()
  })

  it('accepts a custom label', () => {
    const store = createDecisionStore({
      initial: { id: 'd', title: '', factors: [], alternatives: [] },
    })
    render(
      <DecisionStoreProvider store={store}>
        <MemoryRouter>
          <ImportDecisionButton label="Restore a saved decision" />
        </MemoryRouter>
      </DecisionStoreProvider>,
    )
    expect(
      screen.getByRole('button', { name: 'Restore a saved decision' }),
    ).toBeInTheDocument()
  })

  it('replaces the decision from a valid file', async () => {
    const user = userEvent.setup()
    const { store } = renderButton()
    const file = new File([exportDecision(complete)], 'd.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(store.getState().decision.title).toBe('House purchase'))
  })

  it('navigates to the furthest reachable step after a complete import (results)', async () => {
    const user = userEvent.setup()
    renderButton()
    const file = new File([exportDecision(complete)], 'd.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/results'))
  })

  it('navigates to the furthest reachable step for a partial import (factors)', async () => {
    const user = userEvent.setup()
    renderButton()
    // title + factor but no alternatives → furthest reachable is /alternatives
    const partial: Decision = {
      id: 'p',
      title: 'Trip',
      factors: [{ id: 'f', name: 'Fun', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }],
      alternatives: [],
    }
    const file = new File([exportDecision(partial)], 'p.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/alternatives'))
  })

  it('shows an error and does not navigate when the file is malformed', async () => {
    const user = userEvent.setup()
    const { store } = renderButton()
    const file = new File(['garbage {'], 'bad.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/import failed/i))
    expect(store.getState().decision.title).toBe('') // unchanged
    expect(screen.getByTestId('path')).toHaveTextContent('/') // did not navigate
  })

  it('does nothing when the picker is dismissed with no file', () => {
    const { store } = renderButton()
    fireEvent.change(screen.getByLabelText(/import decision file/i), { target: { files: [] } })
    expect(store.getState().decision.title).toBe('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens the hidden file picker when the button is clicked', async () => {
    const user = userEvent.setup()
    renderButton()
    const input = screen.getByLabelText(/import decision file/i)
    const click = vi.spyOn(input, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: /import/i }))
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()
  })

  it('shows a generic message when import fails with a non-Error value', async () => {
    const user = userEvent.setup()
    vi.spyOn(decisionFile, 'readDecisionFile').mockRejectedValue('kaboom')
    renderButton()
    const file = new File(['{}'], 'x.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/import decision file/i), file)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not import that file/i),
    )
    vi.restoreAllMocks()
  })
})
