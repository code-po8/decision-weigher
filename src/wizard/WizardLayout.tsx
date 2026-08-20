// Shared chrome for a wizard step: the progress indicator, the step's content,
// and Back/Next navigation. Next is disabled until the step's requirement is met
// (isStepComplete); on the terminal step Next is hidden.

import { useNavigate } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { WizardProgress } from './WizardProgress'
import {
  isStepComplete,
  nextStep,
  previousStep,
  STEP_PATHS,
  STEP_LABELS,
  type WizardStep,
} from './steps'
import type { ReactNode } from 'react'

export interface WizardLayoutProps {
  step: WizardStep
  children: ReactNode
}

export function WizardLayout({ step, children }: WizardLayoutProps) {
  const navigate = useNavigate()
  const decision = useDecisionStore((s) => s.decision)

  const prev = previousStep(step)
  const next = nextStep(step)
  const canAdvance = isStepComplete(step, decision)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <WizardProgress current={step} />

      <section
        aria-label={STEP_LABELS[step]}
        className="rounded-xl border border-line bg-surface p-6 shadow-sm"
      >
        {children}
      </section>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => prev && navigate(STEP_PATHS[prev])}
          disabled={!prev}
          className="rounded border border-line bg-surface px-4 py-2 text-ink hover:bg-surface-2 disabled:opacity-40"
        >
          Back
        </button>

        {next && (
          <button
            type="button"
            onClick={() => navigate(STEP_PATHS[next])}
            disabled={!canAdvance}
            className="rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:brightness-110 disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
