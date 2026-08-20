// Test helper: render the wizard routes at a given initial path with a store
// seeded from a partial decision. Returns the store api so tests can drive
// actions and assert on state.

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DecisionStoreProvider } from '../store/DecisionStoreContext'
import { createDecisionStore } from '../store/decisionStore'
import { WizardRoutes } from '../wizard/WizardRoutes'
import type { Decision } from '../domain/types'

export function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return { id: 'd', title: '', factors: [], alternatives: [], ...overrides }
}

export interface RenderWizardOptions {
  initialPath?: string
  decision?: Partial<Decision>
}

export function renderWizard(options: RenderWizardOptions = {}) {
  const store = createDecisionStore({ initial: makeDecision(options.decision) })
  const utils = render(
    <DecisionStoreProvider store={store}>
      <MemoryRouter initialEntries={[options.initialPath ?? '/']}>
        <WizardRoutes />
      </MemoryRouter>
    </DecisionStoreProvider>,
  )
  return { store, ...utils }
}
