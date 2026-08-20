// Ranked list: alternatives best → worst with their overall score.

import { useMemo } from 'react'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { rank } from '../domain/scoring'
import { scoreToTen, scoreToPercent } from './format'

export function RankedList() {
  const decision = useDecisionStore((s) => s.decision)
  const ranking = useMemo(() => rank(decision), [decision])

  return (
    <ol aria-label="Ranking" className="space-y-2">
      {ranking.map((entry) => (
        <li
          key={entry.alternative.id}
          className={`flex items-center justify-between rounded-lg border p-3 ${
            entry.rank === 1
              ? 'border-positive/50 bg-positive-soft'
              : 'border-line bg-surface'
          }`}
          data-rank={entry.rank}
        >
          <span className="flex items-center gap-3">
            <span className="w-6 text-right font-mono text-ink-muted">{entry.rank}</span>
            <span className="font-medium text-ink">{entry.alternative.name}</span>
            {entry.rank === 1 && (
              <span className="rounded-full bg-positive px-2 py-0.5 text-xs font-medium text-accent-contrast">
                Winner
              </span>
            )}
          </span>
          <span className="text-right">
            <span className="font-semibold text-ink">{scoreToTen(entry.score)}</span>
            <span className="ml-2 text-sm text-ink-muted">{scoreToPercent(entry.score)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
