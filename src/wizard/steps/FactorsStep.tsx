// Factors step: list and edit existing factors, and add new ones. Having at
// least one factor completes the step (unlocking alternatives).

import { useDecisionStore } from '../../store/DecisionStoreContext'
import { FactorRow } from './FactorRow'
import { AddFactorForm } from './AddFactorForm'

export function FactorsStep() {
  const factors = useDecisionStore((s) => s.decision.factors)

  return (
    <div data-testid="step-factors">
      <h2 className="text-2xl font-bold text-ink">Factors</h2>
      <p className="mt-2 text-ink-muted">
        What matters in this decision, and how much? Give each factor a weight,
        say whether higher or lower is better, and pick a rating scale.
      </p>

      {factors.length === 0 ? (
        <p className="mt-6 text-ink-muted">No factors yet — add your first one below.</p>
      ) : (
        <ul aria-label="Factors" className="mt-6 space-y-3">
          {factors.map((factor) => (
            <FactorRow key={factor.id} factor={factor} />
          ))}
        </ul>
      )}

      <AddFactorForm />
    </div>
  )
}
