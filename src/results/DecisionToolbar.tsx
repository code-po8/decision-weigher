// Actions available on the results view: export the decision to a JSON file,
// import one from disk (replacing the current decision), and open the printable
// report. Import errors are surfaced inline rather than thrown at the user.

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { downloadDecision, readDecisionFile } from './decisionFile'

export function DecisionToolbar() {
  const navigate = useNavigate()
  const decision = useDecisionStore((s) => s.decision)
  const replaceDecision = useDecisionStore((s) => s.replaceDecision)
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      replaceDecision(await readDecisionFile(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that file.')
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadDecision(decision)}
          className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-surface-2"
        >
          Export JSON
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-surface-2"
        >
          Import JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Import decision file"
          className="hidden"
          onChange={(e) => {
            void onImport(e.target.files?.[0])
            e.target.value = '' // allow re-importing the same file
          }}
        />

        <button
          type="button"
          onClick={() => navigate('/report')}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:brightness-110"
        >
          Printable report
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Import failed: {error}
        </p>
      )}
    </div>
  )
}
