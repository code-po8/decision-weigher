#!/usr/bin/env sh
# Pre-commit checks, run INSIDE the sandbox container (see the `hooks` service
# in docker-compose.yml). This keeps eslint / prettier / tsc / vitest / gitleaks
# — all of which execute third-party dependency code — off the host user.
#
# Invoked by scripts/run-hooks.sh, which is called from .husky/pre-commit.
# Runs with network_mode: none; the gitleaks binary is baked into the image.
set -eu

echo "== pre-commit checks (sandboxed) =="

# 1. Secret scan on staged changes, using the gitleaks binary baked into the
#    image at build time (offline). Resolve whichever cached version exists.
echo "-- secret scan (gitleaks) --"
GITLEAKS_BIN="$(ls "$HOME"/.gitleaks-cache/*/gitleaks 2>/dev/null | head -n1 || true)"
if [ -n "$GITLEAKS_BIN" ]; then
  "$GITLEAKS_BIN" protect --staged --redact --no-banner
else
  echo "   WARN: gitleaks binary not baked into image; skipping secret scan." >&2
  echo "   Rebuild the image with network access to bake it in." >&2
fi

# 2. lint-staged: eslint --fix + prettier --write on staged files.
echo "-- lint-staged (eslint + prettier) --"
npx lint-staged

# 3. Type check (whole project).
echo "-- type-check --"
npm run type-check

# 4. Unit tests related to staged source files only.
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR \
  | grep -E '\.(ts|tsx)$' \
  | tr '\n' ' ' || true)
if [ -n "$STAGED_FILES" ]; then
  echo "-- vitest related --"
  npx vitest related --run $STAGED_FILES
else
  echo "-- vitest related: no .ts/.tsx staged, skipping --"
fi

echo "== pre-commit checks passed =="
