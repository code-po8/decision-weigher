// Sensitivity hint: highlights the factor whose weight most affects the outcome,
// with a plain-language note about what would change if you weighted it less.

import { useMemo } from 'react'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { mostInfluentialFactor } from '../domain/sensitivity'

export function SensitivityHint() {
  const decision = useDecisionStore((s) => s.decision)
  const top = useMemo(() => mostInfluentialFactor(decision), [decision])

  if (!top) {
    return <p className="text-ink-muted">Add factors to see a sensitivity analysis.</p>
  }

  return (
    <div className="space-y-3 text-ink" aria-label="Sensitivity">
      <p>
        The most influential factor is <strong>{top.factor.name}</strong>.
      </p>
      {top.changesWinner ? (
        <p className="text-ink-muted">
          If you weighted <strong>{top.factor.name}</strong> much less, a different
          alternative would win. It is decisive to this outcome.
        </p>
      ) : top.rankMovement > 0 ? (
        <p className="text-ink-muted">
          Changing the weight of <strong>{top.factor.name}</strong> reshuffles the
          middle of the ranking, though the winner stays the same.
        </p>
      ) : (
        <p className="text-ink-muted">
          The ranking is robust — no single factor&rsquo;s weight changes the order on
          its own.
        </p>
      )}
    </div>
  )
}
