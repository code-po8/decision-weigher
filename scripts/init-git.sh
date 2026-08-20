#!/usr/bin/env bash
# Initialize this project as a git repository with the PERSONAL identity,
# overriding the machine-global (InterWorks) git identity.
#
# Run on the HOST (git runs on the host; only dependency code is sandboxed).
# Idempotent: safe to re-run — it only (re)sets local config.
#
# Usage:  ./scripts/init-git.sh
set -euo pipefail

# Personal identity used for this repo (matches the user's other personal
# repos under github.com/code-po8). This repo-LOCAL config overrides the
# machine-global user.name/user.email for commits made here.
GIT_USER_NAME="code-po8"
GIT_USER_EMAIL="code-po8@matteorr.com"

if [ ! -d .git ]; then
  git init
fi

git config user.name  "$GIT_USER_NAME"
git config user.email "$GIT_USER_EMAIL"

echo "Local git identity set to: $(git config user.name) <$(git config user.email)>"
echo "(machine-global identity is left untouched)"

# Optional: add the personal remote. The user's other repos use an SSH host
# alias (~/.ssh/config Host github-code-po8) so the personal deploy key is used
# instead of the default github.com key. Uncomment when the GitHub repo exists:
#
#   git remote add origin git@github-code-po8:code-po8/decision-weigher.git
#
echo
echo "Next (optional): add the personal remote once the GitHub repo exists:"
echo "  git remote add origin git@github-code-po8:code-po8/decision-weigher.git"
