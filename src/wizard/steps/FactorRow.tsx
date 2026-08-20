// Inline editor for one existing factor. Name and weight are held as local text
// state so the fields can be temporarily empty/invalid while typing without
// throwing from the store (which rejects a blank name or weight <= 0). Only
// valid values are committed via updateFactor; the store keeps the last valid
// value otherwise.

import { useState } from 'react'
import type { Factor, Direction, Scale } from '../../domain/types'
import { useDecisionStore } from '../../store/DecisionStoreContext'
import { DIRECTION_OPTIONS, SCALE_OPTIONS } from './factorOptions'

export interface FactorRowProps {
  factor: Factor
}

export function FactorRow({ factor }: FactorRowProps) {
  const updateFactor = useDecisionStore((s) => s.updateFactor)
  const removeFactor = useDecisionStore((s) => s.removeFactor)
  const [nameText, setNameText] = useState(factor.name)
  const [weightText, setWeightText] = useState(String(factor.weight))

  const onNameChange = (text: string) => {
    setNameText(text)
    if (text.trim() !== '') updateFactor(factor.id, { name: text })
  }

  const onWeightChange = (text: string) => {
    setWeightText(text)
    const value = Number(text)
    if (text.trim() !== '' && Number.isFinite(value) && value > 0) {
      updateFactor(factor.id, { weight: value })
    }
  }

  return (
    <li className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-3">
      <label className="flex flex-col text-xs font-medium text-ink">
        Name
        <input
          type="text"
          aria-label={`Factor name for ${factor.name}`}
          value={nameText}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1 rounded border border-line bg-surface-2 px-2 py-1 text-sm font-normal"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-ink">
        Weight
        <input
          type="number"
          min="0.1"
          step="0.1"
          aria-label={`Weight for ${factor.name}`}
          value={weightText}
          onChange={(e) => onWeightChange(e.target.value)}
          className="mt-1 w-20 rounded border border-line bg-surface-2 px-2 py-1 text-sm font-normal"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-ink">
        Direction
        <select
          aria-label={`Direction for ${factor.name}`}
          value={factor.direction}
          onChange={(e) => updateFactor(factor.id, { direction: e.target.value as Direction })}
          className="mt-1 rounded border border-line bg-surface-2 px-2 py-1 text-sm font-normal"
        >
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs font-medium text-ink">
        Scale
        <select
          aria-label={`Scale for ${factor.name}`}
          value={factor.scale.kind}
          onChange={(e) =>
            updateFactor(factor.id, { scale: { kind: e.target.value as Scale['kind'] } })
          }
          className="mt-1 rounded border border-line bg-surface-2 px-2 py-1 text-sm font-normal"
        >
          {SCALE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        aria-label={`Remove ${factor.name}`}
        onClick={() => removeFactor(factor.id)}
        className="ml-auto rounded border border-danger/40 px-3 py-1 text-sm text-danger hover:bg-danger-soft"
      >
        Remove
      </button>
    </li>
  )
}
