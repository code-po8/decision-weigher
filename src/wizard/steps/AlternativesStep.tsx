// Alternatives step: add the options being compared, and rate each on every
// factor (on that factor's own scale). Having at least one alternative completes
// the step (unlocking results).

import { useDecisionStore } from '../../store/DecisionStoreContext'
import { AlternativeCard } from './AlternativeCard'
import { AddAlternativeForm } from './AddAlternativeForm'

export function AlternativesStep() {
  const factors = useDecisionStore((s) => s.decision.factors)
  const alternatives = useDecisionStore((s) => s.decision.alternatives)

  return (
    <div data-testid="step-alternatives">
      <h2 className="text-2xl font-bold text-ink">Alternatives</h2>
      <p className="mt-2 text-ink-muted">
        Which options are you comparing? Rate each one on every factor.
      </p>

      {alternatives.length === 0 ? (
        <p className="mt-6 text-ink-muted">No alternatives yet — add your first one below.</p>
      ) : (
        <ul aria-label="Alternatives" className="mt-6 space-y-4">
          {alternatives.map((alternative) => (
            <AlternativeCard key={alternative.id} alternative={alternative} factors={factors} />
          ))}
        </ul>
      )}

      <AddAlternativeForm />
    </div>
  )
}
