// Contribution breakdown: for each alternative (in ranked order), a stacked bar
// showing how much each factor contributed to its score, so you can see WHY one
// came out ahead. Each segment's width is its share of the total weighted score.

import { useMemo } from 'react'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { rank } from '../domain/scoring'
import { scoreToTen } from './format'

// A small, fixed, colour-blind-friendly palette cycled across factors.
const SEGMENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2']

export function ContributionBreakdown() {
  const decision = useDecisionStore((s) => s.decision)
  const factors = decision.factors
  const ranking = useMemo(() => rank(decision), [decision])

  // Every contribution's factorId is one of `factors`, so a direct index/name
  // lookup is always defined — no fallback needed. Colours cycle by position.
  const colorFor = (factorId: string) => {
    const idx = factors.findIndex((f) => f.id === factorId)
    return SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
  }
  const nameFor = (factorId: string) =>
    factors.find((f) => f.id === factorId)!.name

  return (
    <div className="space-y-6">
      {ranking.map((entry) => {
        const totalWeighted = entry.contributions.reduce((s, c) => s + c.weighted, 0)
        return (
          <div key={entry.alternative.id}>
            <div className="mb-1 flex justify-between text-sm text-ink">
              <span className="font-medium">
                {entry.rank}. {entry.alternative.name}
              </span>
              <span className="text-ink-muted">{scoreToTen(entry.score)} / 10</span>
            </div>
            <div
              className="flex h-6 w-full overflow-hidden rounded bg-surface-2"
              role="img"
              aria-label={`Contribution breakdown for ${entry.alternative.name}`}
            >
              {entry.contributions.map((c) => {
                const pct = totalWeighted > 0 ? (c.weighted / totalWeighted) * 100 : 0
                return (
                  <div
                    key={c.factorId}
                    title={`${nameFor(c.factorId)}: ${c.weighted.toFixed(2)}`}
                    style={{ width: `${pct}%`, backgroundColor: colorFor(c.factorId) }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <ul className="flex flex-wrap gap-4 text-sm text-ink" aria-label="Legend">
        {factors.map((f) => (
          <li key={f.id} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: colorFor(f.id) }}
            />
            {f.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
