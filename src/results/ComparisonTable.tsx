// Comparison table: an alternatives × factors matrix of the raw ratings, with
// the winning alternative's column highlighted. Columns are in ranked order so
// the winner is leftmost.

import { useMemo } from 'react'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { rank } from '../domain/scoring'
import { scoreToTen } from './format'
import type { Scale } from '../domain/types'

function formatRating(value: number | undefined, scale: Scale): string {
  if (value === undefined) return '—'
  if (scale.kind === 'boolean') return value >= 1 ? 'Yes' : 'No'
  return String(value)
}

export function ComparisonTable() {
  const decision = useDecisionStore((s) => s.decision)
  const factors = decision.factors
  const ranking = useMemo(() => rank(decision), [decision])

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-line p-2 text-left">Factor</th>
            {ranking.map((entry) => (
              <th
                key={entry.alternative.id}
                className={`border-b border-line p-2 text-left ${entry.rank === 1 ? 'bg-positive-soft' : ''}`}
                data-winner={entry.rank === 1 ? 'true' : undefined}
              >
                {entry.alternative.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {factors.map((factor) => (
            <tr key={factor.id}>
              <th scope="row" className="border-b border-line p-2 text-left font-medium">
                {factor.name}
                <span className="ml-1 text-xs text-ink-muted">×{factor.weight}</span>
              </th>
              {ranking.map((entry) => (
                <td
                  key={entry.alternative.id}
                  className={`border-b border-line p-2 ${entry.rank === 1 ? 'bg-positive-soft' : ''}`}
                >
                  {formatRating(entry.alternative.ratings[factor.id], factor.scale)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="p-2 text-left font-semibold text-ink">
              Score
            </th>
            {ranking.map((entry) => (
              <td
                key={entry.alternative.id}
                className={`p-2 font-semibold ${entry.rank === 1 ? 'bg-positive-soft' : ''}`}
              >
                {scoreToTen(entry.score)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
