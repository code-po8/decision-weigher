// Add-an-alternative form. The store rejects a blank name (throws), so Add is
// disabled until a non-blank name is entered.

import { useState } from 'react'
import { useDecisionStore } from '../../store/DecisionStoreContext'

export function AddAlternativeForm() {
  const addAlternative = useDecisionStore((s) => s.addAlternative)
  const [name, setName] = useState('')
  const valid = name.trim() !== ''

  const submit = () => {
    addAlternative({ name })
    setName('')
  }

  return (
    <form
      className="mt-6 flex items-end gap-3 rounded border border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label className="flex flex-1 flex-col text-sm font-medium text-ink">
        New alternative name
        <input
          type="text"
          aria-label="New alternative name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tesla Model 3"
          className="mt-1 rounded border border-line bg-surface px-2 py-1 font-normal"
        />
      </label>
      <button
        type="submit"
        disabled={!valid}
        className="rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:brightness-110 disabled:opacity-40"
      >
        Add alternative
      </button>
    </form>
  )
}
