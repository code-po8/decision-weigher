// Mutation testing config (Stryker). A DIAGNOSTIC, not a CI gate — it finds
// tests that execute code without asserting anything (which line coverage
// cannot see). Runs in Docker (docker compose run --rm mutation). Slow.
//
// Scope while iterating:
//   docker compose run --rm mutation npx stryker run --mutate 'src/domain/**/*.ts'
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  coverageAnalysis: 'perTest',
  // Mutate application logic; skip tests, React entry points, and UI-only files
  // that are better covered by component/e2e tests than by mutation scoring.
  mutate: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.{test,spec}.{ts,tsx}',
    '!src/main.tsx',
    '!src/test/**',
    '!src/**/*.d.ts',
  ],
}
