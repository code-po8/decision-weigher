import { describe, it } from 'vitest'
import { renderWizard } from '../test/renderWizard'
import { expectNoAxeViolations } from '../test/axe'
import type { Factor, Alternative } from '../domain/types'

const cost: Factor = { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }
const nacs: Factor = { id: 'nacs', name: 'NACS', weight: 2, direction: 'higher-is-better', scale: { kind: 'boolean' } }
const m3: Alternative = { id: 'm3', name: 'Model 3', ratings: { cost: 45, nacs: 1 } }

// Automated accessibility checks (axe-core) for each wizard screen. These catch
// structural a11y problems — missing labels, invalid ARIA, bad roles — in the
// rendered DOM. True colour-contrast is verified in the Playwright a11y suite,
// where a real browser can measure it.

describe('accessibility (axe) — wizard screens', () => {
  it('decision step has no violations', async () => {
    const { container } = renderWizard({ initialPath: '/', decision: { title: 'Car' } })
    await expectNoAxeViolations(container)
  })

  it('factors step (with the add form and a row) has no violations', async () => {
    const { container } = renderWizard({
      initialPath: '/factors',
      decision: { title: 'Car', factors: [cost, nacs] },
    })
    await expectNoAxeViolations(container)
  })

  it('alternatives step (with ratings) has no violations', async () => {
    const { container } = renderWizard({
      initialPath: '/alternatives',
      decision: { title: 'Car', factors: [cost, nacs], alternatives: [m3] },
    })
    await expectNoAxeViolations(container)
  })

  it('results step (tabs, tables) has no violations', async () => {
    const { container } = renderWizard({
      initialPath: '/results',
      decision: { title: 'Car', factors: [cost, nacs], alternatives: [m3] },
    })
    await expectNoAxeViolations(container)
  })

  it('printable report has no violations', async () => {
    const { container } = renderWizard({
      initialPath: '/report',
      decision: { title: 'Car', description: 'notes', factors: [cost, nacs], alternatives: [m3] },
    })
    await expectNoAxeViolations(container)
  })
})
