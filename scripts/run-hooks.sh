#!/usr/bin/env sh
# Host-side entry point for the sandboxed pre-commit checks.
#
# Called by .husky/pre-commit (which runs under POSIX sh). Runs the `hooks`
# compose service, which executes eslint / prettier / tsc / vitest / gitleaks
# INSIDE a container (no $HOME, no ~/.ssh, non-root, no network) so none of that
# dependency code runs on the host user. lint-staged's `--fix`/`--write` edits
# land on the bind-mounted source, so any auto-formatting is reflected on the
# host and re-staged below.
set -eu

if ! docker compose version >/dev/null 2>&1; then
  echo "pre-commit: Docker Compose not available — cannot run sandboxed hooks." >&2
  echo "Install Docker, or commit with --no-verify if you accept the risk." >&2
  exit 1
fi

# Run the checks in the container. Build is cached after the first run.
docker compose run --rm hooks

# lint-staged may have auto-fixed staged files (eslint --fix / prettier --write).
# Re-stage anything it touched so the fixes are part of the commit.
git update-index --again || true
