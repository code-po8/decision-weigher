// One alternative: an editable name, a rating control for every factor, and a
// remove button. The name is held as local text so a blank intermediate value
// doesn't throw from the store; only a non-blank name commits.

import { useState } from 'react'
import type { Alternative, Factor } from '../../domain/types'
import { useDecisionStore } from '../../store/DecisionStoreContext'
import { RatingInput } from './RatingInput'

export interface AlternativeCardProps {
  alternative: Alternative
  factors: Factor[]
}

export function AlternativeCard({ alternative, factors }: AlternativeCardProps) {
  const updateAlternative = useDecisionStore((s) => s.updateAlternative)
  const removeAlternative = useDecisionStore((s) => s.removeAlternative)
  const [nameText, setNameText] = useState(alternative.name)

  const onNameChange = (text: string) => {
    setNameText(text)
    if (text.trim() !== '') updateAlternative(alternative.id, { name: text })
  }

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          aria-label={`Alternative name for ${alternative.name}`}
          value={nameText}
          onChange={(e) => onNameChange(e.target.value)}
          className="flex-1 rounded border border-line px-2 py-1 font-medium"
        />
        <button
          type="button"
          aria-label={`Remove ${alternative.name}`}
          onClick={() => removeAlternative(alternative.id)}
          className="rounded border border-danger/40 px-3 py-1 text-sm text-danger hover:bg-danger-soft"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {factors.map((factor) => (
          <RatingInput key={factor.id} alternative={alternative} factor={factor} />
        ))}
      </div>
    </li>
  )
}
