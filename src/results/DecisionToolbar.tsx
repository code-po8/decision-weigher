// Actions on the results view: export the decision to a JSON file, import one
// (via the shared ImportDecisionButton), and open the printable report.

import { useNavigate } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { downloadDecision } from './decisionFile'
import { ImportDecisionButton } from './ImportDecisionButton'

export function DecisionToolbar() {
  const navigate = useNavigate()
  const decision = useDecisionStore((s) => s.decision)

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          onClick={() => downloadDecision(decision)}
          className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-surface-2"
        >
          Export JSON
        </button>

        <ImportDecisionButton />

        <button
          type="button"
          onClick={() => navigate('/report')}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:brightness-110"
        >
          Printable report
        </button>
      </div>
    </div>
  )
}
