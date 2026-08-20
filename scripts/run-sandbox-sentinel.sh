#!/usr/bin/env bash
# Host-side driver for the sandbox sentinel.
#
# Places a marker file in the REAL host $HOME, then runs the network-isolated
# `sentinel` container which tries (and must fail) to read it. Cleans up after.
#
# Usage:  ./scripts/run-sandbox-sentinel.sh
# Exit 0 = sandbox isolation verified.
set -euo pipefail

MARKER="$HOME/.decision-weigher-sandbox-sentinel"
cleanup() { rm -f "$MARKER"; }
trap cleanup EXIT

echo "secret-do-not-leak-$$" > "$MARKER"
echo "Placed host sentinel at: $MARKER"

# network_mode: none is baked into the `sentinel` service. The container has no
# $HOME mount, so it must not be able to read the marker above.
docker compose run --rm sentinel
