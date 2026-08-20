# Stories

Feature backlog, worked **one card per iteration, TDD-first**, with a human
checkpoint after each (see `CLAUDE.md`). Order below is a starting guess — pick
the best-ready card each iteration, not strictly top-to-bottom.

Status legend: `todo` · `in-progress` · `complete`

---

## Backlog summary

- Scaffold: **complete** (Docker sandbox, pinned toolchain, CI, docs).
- DW-001 domain + scoring: **complete** (100% coverage, 100% mutation score).
- DW-002 decision store: **complete** (100% coverage, 100% mutation score).
- DW-003 JSON export/import: **complete** (100% coverage, 100% mutation score).
- DW-004 wizard shell + routing: **complete** (100% coverage; steps logic 100% mutation).
- DW-005 decision step: **complete** (100% coverage).
- DW-006 factors step: **complete** (100% coverage).
- DW-007 alternatives + ratings step: **complete** (100% coverage).
- DW-008 results view (tabbed): **complete** (100% coverage; format 100% mutation,
  sensitivity 97% — one documented equivalent mutant).
- DW-009 report route + export/import wiring: **complete** (100% coverage).
- DW-010 E2E happy path: **complete** (car example, tabs, export, import-reject).
- DW-011 near-deploy hardening: **complete** (Renovate, audit gate, mutation pass).
- **Feature cards remaining: 0 — backlog complete.**

---

### DW-000 — Project scaffold — `complete`

Docker sandbox (isolated, no `$HOME`/`~/.ssh`, non-root, network-isolated
runners), exact-pinned React/Vite/TS/Vitest/Playwright/Stryker toolchain,
digest-pinned images, `.npmrc` hardening, husky pre-commit-in-container, high
coverage thresholds, CI workflow, and docs (`README`, `DEVELOPMENT`, `CLAUDE`,
this file). Placeholder `App` + smoke unit/e2e tests prove the toolchain is
green.

---

### DW-001 — Domain types + scoring engine — `complete`

Pure TS, no UI. The most-tested module. Delivered `src/domain/types.ts` +
`src/domain/scoring.ts` with `scaleMax`, `normalizeRating`, `adjustForDirection`,
`factorContribution`, `score`, `rank`. 23 unit tests, 100% coverage, **100%
mutation score** (47/47 mutants killed). Chosen edge-case rules (documented +
tested): missing rating = 0 on scale (no credit); out-of-range ratings clamped;
zero total weight → score 0; ties broken by name ascending.

- Types: `Scale` (`0-10` | `0-100` | `boolean`), `Factor` (id, name, weight>0,
  `direction`, `scale`), `Alternative` (id, name, ratings by factorId),
  `Decision`.
- `scaleMax(scale)` → 10 | 100 | 1.
- `score(decision, alternative)` — normalize each rating to 0–1
  (`clamp(rating,0,max)/max`), invert if `lower-is-better`, weighted average by
  factor weight; returns 0–1.
- `rank(decision)` — alternatives sorted desc by score, with a deterministic
  tie-break (e.g. by name) and each alternative's per-factor contributions.

**Acceptance:** exhaustive unit tests for mixed scales, direction inversion,
decimals, out-of-range ratings (clamp), missing ratings (defined behavior),
zero total weight (defined behavior), single/empty factor & alternative sets,
and tie handling. Coverage ≥ threshold; mutation-clean on `src/domain/**`.

---

### DW-002 — Decision store (Zustand) — `complete`

Depends on DW-001. Delivered `src/store/decisionStore.ts` via a
`createDecisionStore` factory (vanilla zustand store, injectable id generator).
Actions: setTitle/setDescription/replaceDecision/reset; addFactor/updateFactor/
removeFactor (removing a factor strips its ratings from every alternative);
addAlternative/updateAlternative/removeAlternative; setRating/clearRating; and a
pure `ranking()` selector delegating to DW-001. Validation at the input boundary:
weight > 0, non-blank (trimmed) names, ratings within `[0, scaleMax]`, and
unknown-id guards — all throw with clear messages. 43 store tests (68 total),
100% coverage, **100% mutation score** (164 mutants killed).

Notes for the UI cards: validation THROWS, so the wizard inputs must guard/clamp
before calling actions (or catch) rather than surface raw errors.

---

### DW-003 — JSON export / import — `complete`

Delivered `src/domain/serialization.ts`: `exportDecision` (pretty-printed JSON
with a `schemaVersion` envelope) and `importDecision` (validates UNTRUSTED input
— structure, types, weight > 0, valid scale/direction, ratings within scale,
duplicate ids, ratings referencing unknown factors, and a 5 MB byte cap —
throwing a descriptive `ImportError`). No schema-validation dependency added
(hand-rolled to keep the pinned surface minimal). 40 tests (102 total), 100%
coverage, **100% mutation score** (154 mutants killed).

Note: `importDecision`/`exportDecision` operate on STRINGS only — the file
download + file-picker wiring is a thin UI concern for a later card (belongs with
DW-004+ or its own small card). JSON can't encode NaN/Infinity (they become
null), which is documented in the code + tests.

---

### DW-004 — Wizard shell + routing — `complete`

Depends on DW-002. Delivered:
- `src/wizard/steps.ts` — pure step model + guard logic (paths, labels,
  `isStepComplete`, `isStepReachable`, `furthestReachableStep`, next/previous).
  100% coverage, **100% mutation score** (54 killed).
- `src/store/DecisionStoreContext.tsx` — React binding (`DecisionStoreProvider`,
  `useDecisionStore` slice hook, `useDecisionStoreApi`); tests can inject a store.
- `src/wizard/` — `WizardProgress` (current/completed/locked, links only to
  reachable steps), `StepGuard` (redirects premature access to the furthest
  reachable step), `WizardLayout` (Back/Next; Next disabled until step complete;
  no Next on terminal step), `WizardRoutes` (route table + unknown-route
  fallback), and placeholder step pages (DecisionStep/FactorsStep/
  AlternativesStep/ResultsStep — filled in by DW-005..008).
- `src/App.tsx` now mounts provider + BrowserRouter + routes.
- Test helper `src/test/renderWizard.tsx`; 34 component tests. Whole suite: 134
  tests, **100% coverage**. E2E smoke updated (wizard on decision step, guarded
  Next). Production build verified.

Guard rules: factors needs a title; alternatives needs title+≥1 factor; results
needs title+≥1 factor+≥1 alternative.

---

### DW-005 — Step: decision — `complete`
`DecisionStep` now renders a required Title input and an optional Description
textarea, both controlled and bound to the store (setTitle/setDescription). A
non-blank title completes the step and unlocks factors. 7 component tests (141
total), 100% coverage. E2E smoke extended: type title → Next enables → advance to
Factors.

### DW-006 — Step: factors — `complete`
`FactorsStep` lists factors (`FactorRow` inline editor: name, weight, direction,
scale, remove) and an `AddFactorForm` (Add disabled until name + positive weight).
Name/weight held as local text state so intermediate empty/invalid values don't
throw from the store; only valid values commit. Shared `factorOptions.ts`.
Removed a dead in-handler re-validation guard (disabled submit blocks implicit
Enter submit) rather than keep untestable code. 15 component tests (156 total),
100% coverage. E2E extended: add a factor → advance to alternatives.

### DW-007 — Step: alternatives + ratings — `complete`
`AlternativesStep` lists `AlternativeCard`s (editable name, remove, a
`RatingInput` per factor). `RatingInput`: checkbox for boolean (0/1), number
input for 0–10 / 0–100 with decimals — held as local text, clears the rating when
emptied, and only commits values within [0, scaleMax] (never out of range).
`AddAlternativeForm` (Add disabled until non-blank name). 13 component tests (169
total), 100% coverage. E2E now walks decision → factor → alternative+rating →
results.

### DW-008 — Results view (tabbed) — `complete`
`ResultsStep` is a 4-tab accessible tablist:
- **Ranking** (`RankedList`) — best→worst, score as 0–10 + %, winner badge.
- **Breakdown** (`ContributionBreakdown`) — per-alternative stacked bar of each
  factor's weighted contribution, with a legend.
- **Sensitivity** (`SensitivityHint`) — plain-language note on the most
  influential factor, backed by new pure `src/domain/sensitivity.ts`
  (`analyzeSensitivity`/`mostInfluentialFactor`; mutes each factor's weight and
  measures winner change + rank movement). 100% coverage, 97% mutation (one
  documented equivalent mutant on the changesWinner/movement correlation).
- **Comparison** (`ComparisonTable`) — factors × alternatives matrix (ranked
  columns, winner highlighted, Yes/No for booleans, — for missing).
- Pure `src/results/format.ts` (scoreToTen/scoreToPercent, 100% mutation).

Fixed an infinite-render bug: `useDecisionStore((s) => s.ranking())` returned a
fresh array each render → components now select `decision` and `useMemo(rank)`.
32 tests here (196 total), 100% coverage. E2E explores the results tabs.

### DW-009 — Printable report route + export/import wiring — `complete`
`src/report/ReportPage.tsx` at `/report` (guarded like results, no wizard chrome):
title/description, winner recommendation, ranking, comparison table; a
"Print / Save as PDF" button (`window.print()`) and print CSS (`.no-print`,
`@media print`) in `index.css`. Also wired the DW-003 JSON export/import UI I had
deferred: `src/results/decisionFile.ts` (download blob + read File, thin DOM
wrappers over the pure serializer) and `DecisionToolbar` on the results view
(Export JSON / Import JSON with inline error / Printable report). 23 tests here
(217 total), 100% coverage. E2E: export download filename + open report.

### DW-010 — E2E happy path — `complete`
`tests/e2e/wizard.spec.ts`: full wizard for the car example (Cost 0–100
lower-better, Reliability 0–10, Range 0–100, NACS boolean × Model 3 / Mach-E /
Leaf) → ranked results with a single winner → all four result tabs → JSON export
(filename asserted). Second spec: malformed import is rejected and the current
decision is preserved. `smoke.spec.ts` trimmed to a load check. 3 E2E tests pass.

### DW-011 — Renovate + mutation pass + coverage-gate finalize — `complete`
- `renovate.json`: `rangeStrategy: pin` + `minimumReleaseAge: "7 days"` +
  `docker.pinDigests`; holds TypeScript < 7; vulnerability updates bypass the age
  hold; weekly lockfile maintenance. Documented in DEVELOPMENT.md.
- CI: added `npm audit --omit=dev --audit-level=high` (prod deps: 0 vulns; the
  `qs` advisory is dev-only via Stryker and not in the shipped bundle).
- Mutation pass: authoritative per-module scores are 100% for scoring / store /
  serialization / steps / format, 97% for sensitivity (one documented equivalent
  mutant). NOTE: run Stryker PER FILE — a combined `--mutate` run under-reports
  with `coverageAnalysis: perTest` (documented in CLAUDE.md).
- Coverage gate: unchanged at 90% thresholds; actual coverage is 100%.
