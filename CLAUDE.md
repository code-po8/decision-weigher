# Claude Code Instructions

Context and instructions for Claude Code when working on this project.

## Project overview

Decision Weigher — a session-only web app that ranks alternatives for major
decisions using a weighted-factor model (see `README.md`). You define a
decision, its factors (each with a weight, direction, and scale), and
alternatives (rated per factor); the app ranks the alternatives winner→loser.

## Tech stack

- **Framework:** React + TypeScript
- **State:** Zustand
- **Styling:** Tailwind CSS (v4, CSS-first)
- **Testing:** Vitest (unit/component), Playwright (E2E)
- **Mutation testing:** Stryker (diagnostic, not a CI gate)
- **Build:** Vite
- **Deployment:** static build (session-only; no backend in v1)

## Run tests in Docker, not on the host

Installing/running npm dependencies executes untrusted third-party code. The
compose sandbox bind-mounts **only** the repo source (no `$HOME`/`~/.ssh`), runs
as non-root, network-isolates the runners, and keeps `node_modules` in a named
volume. See `DEVELOPMENT.md`. Use:

```bash
docker compose run --rm test        # type-check + unit + coverage
docker compose run --rm e2e         # Playwright
docker compose run --rm sentinel    # prove isolation
```

## Development workflow: TDD loop with human checkpoints

Work the backlog in `STORIES.md` one card per iteration:

1. **Analyze** — read `STORIES.md`, pick the best-ready next card (dependencies
   met, foundation before features), and explain the choice. Do **not** just
   follow list order.
2. **Implement (TDD)** — write failing tests first (red), implement the minimal
   code to pass (green), refactor, then run the full suite to catch
   regressions. Run everything in Docker.
3. **Update** — mark the card complete in `STORIES.md`, adjust the backlog if
   implementation revealed new/split/obsolete cards, update docs if needed.
4. **Stop — human checkpoint** — summarize what was done, report test results
   and coverage, and **wait for approval**. Do NOT auto-start the next card.

### Get approval before committing or pushing

Never `git commit`, `git push`, `git init`, or configure git remotes without
explicit approval. The personal-identity git setup lives in
`scripts/init-git.sh` and is run only on the user's go-ahead.

## Commit convention

Use **Conventional Commits**:

```
type(scope): description

# e.g.
feat(scoring): normalize ratings by scale before weighting
test(store): cover factor add/remove and rating updates
chore(deps): pin exact toolchain versions
```

Do **NOT** add `Co-Authored-By`, `Claude-Session`, or any tool-attribution
trailers. Keep the message to the conventional-commit body only.

## Coverage & quality bar

- High coverage threshold enforced in `vitest.config.ts` (90% lines/branches/
  functions/statements). New logic ships with tests.
- The **scoring engine (`src/domain/`)** is pure and must be exhaustively tested,
  including edge cases (zero total weight, out-of-range ratings, missing
  ratings, ties, boolean/0-100/0-10 scale mixes, direction inversion).
- Mutation testing (`docker compose run --rm mutation`) is a diagnostic to run
  near deployment to catch assertion-free tests. **Run it PER FILE** (e.g.
  `docker compose run --rm mutation npx stryker run --mutate 'src/domain/scoring.ts'`),
  not across many files at once: with `coverageAnalysis: perTest`, a combined run
  mis-associates mutants to tests and under-reports (a file that scores 100% solo
  shows survivors in a multi-file run). Authoritative per-module scores: the pure
  logic modules (`src/domain/*.ts` except the equivalent-mutant note in
  `sensitivity.ts`, `src/store/decisionStore.ts`, `src/wizard/steps.ts`,
  `src/results/format.ts`) are mutation-clean at 100% (sensitivity 97%, one
  documented equivalent mutant).

## Security

- Session-only; no secrets in the repo. Never commit credentials or `.env`.
- All dependencies pinned exact with a 7-day minimum release age; container
  images pinned to digests. See `DEVELOPMENT.md` → pinning policy.
