// Printable report: a clean, single-page summary of the decision suitable for
// saving as a PDF via the browser's print dialog. It reuses the ranked results
// and the comparison table, adds the winner call-out and the sensitivity note,
// and hides its own controls when printing (see the print CSS in index.css).

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDecisionStore } from '../store/DecisionStoreContext'
import { rank } from '../domain/scoring'
import { mostInfluentialFactor } from '../domain/sensitivity'
import { RankedList } from '../results/RankedList'
import { ComparisonTable } from '../results/ComparisonTable'
import { scoreToTen } from '../results/format'

export function ReportPage() {
  const decision = useDecisionStore((s) => s.decision)
  const ranking = useMemo(() => rank(decision), [decision])
  const influential = useMemo(() => mostInfluentialFactor(decision), [decision])
  const winner = ranking[0]

  return (
    <article className="mx-auto max-w-3xl p-8 print:p-0">
      <div className="no-print mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:brightness-110"
        >
          Print / Save as PDF
        </button>
        <Link to="/results" className="rounded border border-line bg-surface px-4 py-2 text-sm text-ink hover:bg-surface-2">
          Back to results
        </Link>
      </div>

      <header className="border-b border-line pb-4">
        <h1 className="text-3xl font-bold">{decision.title || 'Decision report'}</h1>
        {decision.description && (
          <p className="mt-2 text-ink-muted">{decision.description}</p>
        )}
      </header>

      {winner && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Recommendation</h2>
          <p className="mt-1">
            <strong>{winner.alternative.name}</strong> ranks highest, scoring{' '}
            <strong>{scoreToTen(winner.score)}/10</strong>.
            {influential && (
              <>
                {' '}
                The most influential factor is <strong>{influential.factor.name}</strong>.
              </>
            )}
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Ranking</h2>
        <div className="mt-2">
          <RankedList />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Comparison</h2>
        <div className="mt-2">
          <ComparisonTable />
        </div>
      </section>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-muted">
        Generated with Decision Weigher.
      </footer>
    </article>
  )
}
