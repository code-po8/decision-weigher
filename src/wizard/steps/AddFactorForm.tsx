// Add-a-factor form. The store rejects a blank name or a non-positive weight by
// throwing, so the Add button is disabled until the inputs are valid — the throw
// path is never reached from the UI.

import { useState } from 'react'
import type { Direction, Scale } from '../../domain/types'
import { useDecisionStore } from '../../store/DecisionStoreContext'
import { DIRECTION_OPTIONS, SCALE_OPTIONS } from './factorOptions'

const DEFAULT_WEIGHT = '3'

export function AddFactorForm() {
  const addFactor = useDecisionStore((s) => s.addFactor)
  const [name, setName] = useState('')
  const [weightText, setWeightText] = useState(DEFAULT_WEIGHT)
  const [direction, setDirection] = useState<Direction>('higher-is-better')
  const [scaleKind, setScaleKind] = useState<Scale['kind']>('0-10')

  const weight = Number(weightText)
  const valid = name.trim() !== '' && weightText.trim() !== '' && Number.isFinite(weight) && weight > 0

  // Only ever invoked when `valid` (the submit button is disabled otherwise, and
  // a disabled submit button also blocks implicit Enter submission), so no
  // in-handler re-validation is needed.
  const submit = () => {
    addFactor({ name, weight, direction, scale: { kind: scaleKind } })
    // reset to defaults for the next entry
    setName('')
    setWeightText(DEFAULT_WEIGHT)
    setDirection('higher-is-better')
    setScaleKind('0-10')
  }

  return (
    <form
      className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label className="flex flex-col text-sm font-medium text-ink">
        New factor name
        <input
          type="text"
          aria-label="New factor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Reliability"
          className="mt-1 rounded border border-line bg-surface px-2 py-1 font-normal"
        />
      </label>

      <label className="flex flex-col text-sm font-medium text-ink">
        Weight
        <input
          type="number"
          min="0.1"
          step="0.1"
          aria-label="New factor weight"
          value={weightText}
          onChange={(e) => setWeightText(e.target.value)}
          className="mt-1 w-24 rounded border border-line bg-surface px-2 py-1 font-normal"
        />
      </label>

      <label className="flex flex-col text-sm font-medium text-ink">
        Direction
        <select
          aria-label="New factor direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          className="mt-1 rounded border border-line bg-surface px-2 py-1 font-normal"
        >
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm font-medium text-ink">
        Scale
        <select
          aria-label="New factor scale"
          value={scaleKind}
          onChange={(e) => setScaleKind(e.target.value as Scale['kind'])}
          className="mt-1 rounded border border-line bg-surface px-2 py-1 font-normal"
        >
          {SCALE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={!valid}
        className="rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:brightness-110 disabled:opacity-40"
      >
        Add factor
      </button>
    </form>
  )
}
