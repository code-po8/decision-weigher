// Progress indicator across the four wizard steps. Each step shows one of three
// states: current, completed (a reachable earlier step), or locked (not yet
// reachable). Reachable steps are links; locked steps are inert.

import { Link } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import {
  WIZARD_STEPS,
  STEP_LABELS,
  STEP_PATHS,
  isStepReachable,
  stepIndex,
  type WizardStep,
} from './steps'

type StepState = 'current' | 'completed' | 'locked'

function stepState(step: WizardStep, current: WizardStep, reachable: boolean): StepState {
  if (step === current) return 'current'
  if (reachable && stepIndex(step) < stepIndex(current)) return 'completed'
  return reachable ? 'completed' : 'locked'
}

export interface WizardProgressProps {
  current: WizardStep
}

export function WizardProgress({ current }: WizardProgressProps) {
  const decision = useDecisionStore((s) => s.decision)

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex gap-2">
        {WIZARD_STEPS.map((step, i) => {
          const reachable = isStepReachable(step, decision)
          const state = stepState(step, current, reachable)
          const label = `${i + 1}. ${STEP_LABELS[step]}`
          const base =
            'flex-1 rounded px-3 py-2 text-sm text-center border transition-colors'
          const cls =
            state === 'current'
              ? `${base} border-accent bg-accent-soft font-semibold text-accent-ink`
              : state === 'completed'
                ? `${base} border-positive bg-positive-soft text-positive-ink hover:bg-positive/10`
                : `${base} border-line bg-surface-2 text-ink-muted`

          return (
            <li key={step} className="flex-1">
              {reachable && state !== 'current' ? (
                <Link to={STEP_PATHS[step]} className={cls} aria-current={undefined} data-state={state}>
                  {label}
                </Link>
              ) : (
                <span
                  className={cls}
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-disabled={state === 'locked' ? true : undefined}
                  data-state={state}
                >
                  {label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
