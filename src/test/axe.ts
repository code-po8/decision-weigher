// Accessibility assertion helper for component tests. Runs axe-core against a
// rendered DOM subtree and fails with a readable summary if any violations are
// found. We call axe-core directly (rather than a wrapper matcher) so the
// dependency surface stays minimal and pinned.

import axe from 'axe-core'
import { expect } from 'vitest'

export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    // Report only violations; jsdom can't evaluate some rules (e.g. real colour
    // contrast needs layout), so we keep the rule set to what jsdom supports and
    // cover true contrast in the Playwright a11y suite.
    resultTypes: ['violations'],
    rules: {
      'color-contrast': { enabled: false },
    },
  })

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => {
        const nodes = v.nodes.map((n) => `      ${n.html}`).join('\n')
        return `  [${v.impact}] ${v.id}: ${v.help}\n${nodes}`
      })
      .join('\n')
    expect.fail(`Accessibility violations found:\n${summary}`)
  }
}
