# Development

## Sandboxed development & testing (Docker) — read this first

**All commands that execute dependency code run inside Docker, never on your
host user.** Installing and running npm dependencies executes untrusted
third-party code (install scripts, the dev server, the test runner). Running
that on your host exposes `~/.ssh`, `~/.npmrc` tokens, cloud credentials, your
**git config/identity**, and your whole home directory to a supply-chain
compromise.

The compose sandbox (`docker-compose.yml`) bind-mounts **only the repo source** —
never `$HOME`, never `~/.ssh` — runs as the non-root `node` user, keeps
`node_modules` in a named volume, and network-isolates the test/mutation/hooks
services. The **host is used only for editing files and running `git`.**

### Commands

```bash
# Install pinned deps into the named volume (run first; re-run when
# package.json / package-lock.json changes). Generates package-lock.json on the
# first run.
docker compose run --rm install

# Dev server → http://localhost:5173
docker compose up frontend

# Type-check + unit tests + coverage (network-isolated)
docker compose run --rm test

# Prove the sandbox is isolated: no host $HOME / ~/.ssh access, no network.
# (Host-side driver plants a marker in $HOME the container must fail to read.)
./scripts/run-sandbox-sentinel.sh

# Mutation testing (diagnostic, slow; near-deploy). Report → reports/mutation/.
docker compose run --rm mutation

# E2E (Playwright) — boots Vite inside the Playwright container.
docker compose run --rm e2e
```

> The raw `npm run …` scripts exist and work, but **prefer the containerized
> commands** so dependency code never runs on your host user. The pre-commit
> hook runs the same checks in the `hooks` container.

### One-time: enable git hooks

Because `.npmrc` sets `ignore-scripts=true`, husky's `prepare` script does **not**
auto-run on install. Enable the hooks once, in the container:

```bash
docker compose run --rm install
docker compose run --rm --entrypoint sh frontend -c "npm run prepare"
```

After that, `git commit` triggers `.husky/pre-commit`, which runs
eslint / prettier / type-check / vitest / gitleaks inside the `hooks` container.

## Turning this into a git repo (personal identity)

This repo must commit under the **personal** GitHub identity, overriding the
machine-global (InterWorks) identity. A helper script does this:

```bash
./scripts/init-git.sh
```

It runs `git init` (if needed) and sets **repo-local**:

- `user.name  = code-po8`
- `user.email = code-po8@matteorr.com`

Repo-local config overrides the global identity for commits made here; the
global identity is left untouched.

### Personal remote (optional, when the GitHub repo exists)

The personal repos use an SSH host alias so the personal deploy key is used
instead of the default `github.com` key. Add the remote when ready:

```bash
git remote add origin git@github-code-po8:code-po8/decision-weigher.git
```

(That `github-code-po8` alias is defined in `~/.ssh/config` on the host.)

## Dependency & image pinning policy

- **Exact versions only.** `.npmrc` sets `save-exact=true`; there are no `^`/`~`
  ranges in `package.json`. The lockfile carries integrity hashes.
- **7-day minimum release age.** Any version added or bumped must be at least 7
  days old at the time it is pinned — a guard against a freshly-published
  compromised release. This is enforced automatically by Renovate
  (`renovate.json`: `minimumReleaseAge: "7 days"`, `rangeStrategy: "pin"`,
  `docker.pinDigests`), which also holds TypeScript on 6.x until
  `typescript-eslint` supports 7. Security (vulnerability) updates bypass the age
  hold. Enable Renovate by installing its GitHub app on the repo.
- **Container images pinned to digests.** The Node base image and the Playwright
  E2E image are pinned to `@sha256:…` digests, not floating tags. To bump one:
  pull the new tag, read its `RepoDigest`
  (`docker inspect --format '{{index .RepoDigests 0}}' <image>`), and update the
  tag and digest together.

## Deployment & base path

The app is a static client-side SPA (session-only), so it can be hosted anywhere
that serves files. The **public base path is deploy-driven, never hard-coded**:

- `vite.config.ts` reads `base` from `PUBLIC_BASE_PATH` (default `/`).
- The router's basename follows the resolved base via `import.meta.env.BASE_URL`
  (`src/routerBase.ts`), so it's configured in exactly one place per deploy.

Targets:

- **Root** (Docker, custom domain, local dev): don't set the variable — base is
  `/`. Build with `npm run build`, serve `dist/` from any static server.
- **Subpath** (e.g. served from `/decision-weigher/`): set
  `PUBLIC_BASE_PATH=/decision-weigher/` at build time.
- **GitHub Pages**: `.github/workflows/deploy-pages.yml` builds on push to `main`
  with `PUBLIC_BASE_PATH=/<repo-name>/` (derived from the repo, not hard-coded)
  and deploys. Enable once in **Settings → Pages → Source → "GitHub Actions"**.
  `public/404.html` + a snippet in `index.html` restore deep links that a static
  host would otherwise 404 (`pathSegmentsToKeep = 1` for a project Page under
  `/<repo>/`; `0` for root hosting).

## Project layout

```
src/
  domain/        # pure types + scoring engine (heaviest test coverage)
  store/         # Zustand decision store
  wizard/        # wizard steps + routing
  results/       # results views (ranked / breakdown / sensitivity / table)
  report/        # printable report route
  test/          # vitest setup
tests/e2e/       # Playwright specs
scripts/         # sandbox sentinel, hooks, git init
```
