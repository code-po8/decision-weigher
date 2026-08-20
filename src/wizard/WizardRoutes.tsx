// Route table for the wizard. Each step route wraps its page in a StepGuard
// (redirects premature access) and the shared WizardLayout (progress + Back/
// Next). Router-agnostic: the surrounding Router is provided by App (or a
// MemoryRouter in tests).

import { Routes, Route, Navigate } from 'react-router-dom'
import { StepGuard } from './StepGuard'
import { WizardLayout } from './WizardLayout'
import { STEP_PATHS, type WizardStep } from './steps'
import { DecisionStep } from './steps/DecisionStep'
import { FactorsStep } from './steps/FactorsStep'
import { AlternativesStep } from './steps/AlternativesStep'
import { ResultsStep } from './steps/ResultsStep'
import { ReportPage } from '../report/ReportPage'
import type { ReactNode } from 'react'

function stepRoute(step: WizardStep, page: ReactNode) {
  return (
    <StepGuard step={step}>
      <WizardLayout step={step}>{page}</WizardLayout>
    </StepGuard>
  )
}

export function WizardRoutes() {
  return (
    <Routes>
      <Route path={STEP_PATHS.decision} element={stepRoute('decision', <DecisionStep />)} />
      <Route path={STEP_PATHS.factors} element={stepRoute('factors', <FactorsStep />)} />
      <Route
        path={STEP_PATHS.alternatives}
        element={stepRoute('alternatives', <AlternativesStep />)}
      />
      <Route path={STEP_PATHS.results} element={stepRoute('results', <ResultsStep />)} />
      {/* Printable report: same reachability as results, but no wizard chrome. */}
      <Route
        path="/report"
        element={
          <StepGuard step="results">
            <ReportPage />
          </StepGuard>
        }
      />
      {/* Unknown routes fall back to the first step. */}
      <Route path="*" element={<Navigate to={STEP_PATHS.decision} replace />} />
    </Routes>
  )
}
