// Guards a wizard step: if the current decision state does not make `step`
// reachable, redirect to the furthest step the user is allowed to be on. This
// prevents deep-linking or Back/Forward from landing on an incomplete step.

import { Navigate } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { furthestReachableStep, isStepReachable, STEP_PATHS, type WizardStep } from './steps'
import type { ReactNode } from 'react'

export interface StepGuardProps {
  step: WizardStep
  children: ReactNode
}

export function StepGuard({ step, children }: StepGuardProps) {
  const decision = useDecisionStore((s) => s.decision)

  if (!isStepReachable(step, decision)) {
    return <Navigate to={STEP_PATHS[furthestReachableStep(decision)]} replace />
  }
  return <>{children}</>
}
