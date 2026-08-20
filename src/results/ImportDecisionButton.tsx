// Reusable "import a saved decision" control: a button that opens a file picker,
// validates + loads the file into the store (replacing the current decision),
// and navigates to the furthest step the imported decision unlocks — so a
// returning user lands on their results, not back at step one. Surfaces import
// errors inline. Used on the first wizard step (restore on landing) and in the
// results toolbar (swap decisions later).

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { readDecisionFile } from './decisionFile'
import { furthestReachableStep, STEP_PATHS } from '../wizard/steps'

export interface ImportDecisionButtonProps {
  /** Button text. Defaults to "Import JSON". */
  label?: string
  /** Extra classes for the button (lets callers match their local styling). */
  className?: string
}

const DEFAULT_CLASS =
  'rounded border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-surface-2'

export function ImportDecisionButton({ label = 'Import JSON', className }: ImportDecisionButtonProps) {
  const navigate = useNavigate()
  const replaceDecision = useDecisionStore((s) => s.replaceDecision)
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const decision = await readDecisionFile(file)
      replaceDecision(decision)
      // Land on the furthest step this decision unlocks (usually results).
      navigate(STEP_PATHS[furthestReachableStep(decision)])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that file.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={className ?? DEFAULT_CLASS}
      >
        {label}
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
      {error && (
        <p role="alert" className="mt-2 w-full text-sm text-danger">
          Import failed: {error}
        </p>
      )}
    </>
  )
}
