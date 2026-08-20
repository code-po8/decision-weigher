// Wizard step model + guard logic (pure).
//
// The wizard has four ordered steps. Each later step has prerequisites derived
// from the decision; a step is "reachable" only when every prerequisite of the
// steps up to and including it is met. This lets the router redirect a premature
// jump back to the furthest step the user is actually allowed to be on.

import type { Decision } from '../domain/types'

export const WIZARD_STEPS = ['decision', 'factors', 'alternatives', 'results'] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]

/** Route path for each step. */
export const STEP_PATHS: Record<WizardStep, string> = {
  decision: '/',
  factors: '/factors',
  alternatives: '/alternatives',
  results: '/results',
}

/** Human labels for the progress indicator. */
export const STEP_LABELS: Record<WizardStep, string> = {
  decision: 'Decision',
  factors: 'Factors',
  alternatives: 'Alternatives',
  results: 'Results',
}

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step)
}

/** Whether the requirement to LEAVE a step (advance past it) is satisfied. */
export function isStepComplete(step: WizardStep, decision: Decision): boolean {
  switch (step) {
    case 'decision':
      return decision.title.trim() !== ''
    case 'factors':
      return decision.factors.length > 0
    case 'alternatives':
      return decision.alternatives.length > 0
    case 'results':
      return true // terminal step
  }
}

/**
 * Whether a step can be navigated to. A step is reachable when every step
 * before it is complete. The first step is always reachable.
 */
export function isStepReachable(step: WizardStep, decision: Decision): boolean {
  const target = stepIndex(step)
  for (let i = 0; i < target; i++) {
    if (!isStepComplete(WIZARD_STEPS[i]!, decision)) return false
  }
  return true
}

/** The furthest step the user is currently allowed to be on. */
export function furthestReachableStep(decision: Decision): WizardStep {
  let furthest: WizardStep = WIZARD_STEPS[0]
  for (const step of WIZARD_STEPS) {
    if (isStepReachable(step, decision)) furthest = step
    else break
  }
  return furthest
}

/** The next step after `step`, or null if it is the last. */
export function nextStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[stepIndex(step) + 1] ?? null
}

/** The previous step before `step`, or null if it is the first. */
export function previousStep(step: WizardStep): WizardStep | null {
  const i = stepIndex(step)
  return i > 0 ? WIZARD_STEPS[i - 1]! : null
}
