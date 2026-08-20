// Results step: the ranked outcome, presented across four selectable tabs —
// ranked list, contribution breakdown, sensitivity hint, and comparison table.

import { useState } from 'react'
import { RankedList } from '../../results/RankedList'
import { ContributionBreakdown } from '../../results/ContributionBreakdown'
import { SensitivityHint } from '../../results/SensitivityHint'
import { ComparisonTable } from '../../results/ComparisonTable'
import { DecisionToolbar } from '../../results/DecisionToolbar'

const TABS = [
  { id: 'ranked', label: 'Ranking', render: () => <RankedList /> },
  { id: 'breakdown', label: 'Breakdown', render: () => <ContributionBreakdown /> },
  { id: 'sensitivity', label: 'Sensitivity', render: () => <SensitivityHint /> },
  { id: 'table', label: 'Comparison', render: () => <ComparisonTable /> },
] as const

type TabId = (typeof TABS)[number]['id']

export function ResultsStep() {
  const [active, setActive] = useState<TabId>('ranked')
  const activeTab = TABS.find((t) => t.id === active)!

  return (
    <div data-testid="step-results">
      <h2 className="text-2xl font-bold text-ink">Results</h2>
      <p className="mt-2 text-ink-muted">Here is how your alternatives rank.</p>

      <div className="mt-6">
        <DecisionToolbar />
      </div>

      <div
        role="tablist"
        aria-label="Results views"
        className="mt-2 flex gap-1 border-b border-line"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px rounded-t border-b-2 px-4 py-2 text-sm transition-colors ${
              tab.id === active
                ? 'border-accent font-semibold text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="mt-6"
      >
        {activeTab.render()}
      </div>
    </div>
  )
}
