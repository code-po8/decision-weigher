import { describe, expect, it } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DecisionStoreProvider,
  useDecisionStore,
  useDecisionStoreApi,
} from './DecisionStoreContext'

describe('DecisionStoreContext', () => {
  it('throws when a store hook is used outside a provider', () => {
    expect(() => renderHook(() => useDecisionStoreApi())).toThrow(
      /must be used within a DecisionStoreProvider/,
    )
  })

  it('creates a default (empty) store when none is injected', () => {
    function Title() {
      const title = useDecisionStore((s) => s.decision.title)
      return <div data-testid="title">{`[${title}]`}</div>
    }
    render(
      <DecisionStoreProvider>
        <Title />
      </DecisionStoreProvider>,
    )
    // A fresh store has an empty title.
    expect(screen.getByTestId('title')).toHaveTextContent('[]')
  })

  it('exposes actions on the default store that update subscribed slices', async () => {
    const user = userEvent.setup()
    function TitleEditor() {
      const title = useDecisionStore((s) => s.decision.title)
      const setTitle = useDecisionStore((s) => s.setTitle)
      return (
        <button type="button" onClick={() => setTitle('Car')}>
          {title || 'empty'}
        </button>
      )
    }
    render(
      <DecisionStoreProvider>
        <TitleEditor />
      </DecisionStoreProvider>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('empty')
    await user.click(btn)
    expect(btn).toHaveTextContent('Car')
  })
})
