// A single (alternative, factor) rating control. Boolean factors render a
// checkbox (0/1). Numeric factors render a number input held as local text so a
// temporarily empty/out-of-range value doesn't throw from the store; clearing
// removes the rating, and only an in-range value is committed.

import { useState } from 'react'
import type { Alternative, Factor } from '../../domain/types'
import { scaleMax } from '../../domain/scoring'
import { useDecisionStore } from '../../store/DecisionStoreContext'

export interface RatingInputProps {
  alternative: Alternative
  factor: Factor
}

export function RatingInput({ alternative, factor }: RatingInputProps) {
  const setRating = useDecisionStore((s) => s.setRating)
  const current = alternative.ratings[factor.id]
  const max = scaleMax(factor.scale)

  const labelText = `${factor.name} rating for ${alternative.name}`

  if (factor.scale.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label={labelText}
          checked={current === 1}
          onChange={(e) => setRating(alternative.id, factor.id, e.target.checked ? 1 : 0)}
        />
        {factor.name}
      </label>
    )
  }

  return <NumericRating alternative={alternative} factor={factor} max={max} labelText={labelText} />
}

interface NumericRatingProps extends RatingInputProps {
  max: number
  labelText: string
}

function NumericRating({ alternative, factor, max, labelText }: NumericRatingProps) {
  const setRating = useDecisionStore((s) => s.setRating)
  const clearRating = useDecisionStore((s) => s.clearRating)
  const current = alternative.ratings[factor.id]
  const [text, setText] = useState(current === undefined ? '' : String(current))

  const onChange = (value: string) => {
    setText(value)
    if (value.trim() === '') {
      clearRating(alternative.id, factor.id)
      return
    }
    const num = Number(value)
    if (Number.isFinite(num) && num >= 0 && num <= max) {
      setRating(alternative.id, factor.id, num)
    }
  }

  return (
    <label className="flex flex-col text-xs font-medium text-ink">
      {`${factor.name} (0–${max})`}
      <input
        type="number"
        min="0"
        max={max}
        step="0.1"
        aria-label={labelText}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-24 rounded border border-line px-2 py-1 text-sm font-normal"
      />
    </label>
  )
}
