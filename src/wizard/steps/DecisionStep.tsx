// Decision step: capture the decision's title (required) and an optional
// description. Both are controlled inputs bound to the store; a non-blank title
// is what makes this step complete (unlocking the factors step).

import { useDecisionStore } from '../../store/DecisionStoreContext'
import { ImportDecisionButton } from '../../results/ImportDecisionButton'

export function DecisionStep() {
  const title = useDecisionStore((s) => s.decision.title)
  const description = useDecisionStore((s) => s.decision.description ?? '')
  const setTitle = useDecisionStore((s) => s.setTitle)
  const setDescription = useDecisionStore((s) => s.setDescription)

  return (
    <div data-testid="step-decision">
      <h2 className="text-2xl font-bold text-ink">Your decision</h2>
      <p className="mt-2 text-ink-muted">What are you trying to decide?</p>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2 p-4">
        <p className="text-sm text-ink-muted">
          Returning? Pick up a decision you exported earlier.
        </p>
        <ImportDecisionButton
          label="Restore a saved decision"
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:brightness-110"
        />
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="decision-title" className="block text-sm font-medium text-ink">
            Title
            <span aria-hidden="true" className="text-danger">
              {' '}
              *
            </span>
          </label>
          <input
            id="decision-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Which EV should I buy?"
            className="mt-1 w-full rounded border border-line px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="decision-description"
            className="block text-sm font-medium text-ink"
          >
            Description <span className="text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="decision-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Any context worth remembering about this decision."
            className="mt-1 w-full rounded border border-line px-3 py-2"
          />
        </div>
      </div>
    </div>
  )
}
