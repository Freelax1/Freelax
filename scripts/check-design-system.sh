#!/usr/bin/env bash
# Design-system drift guards — one entry point for CI and local dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILED=0

bash scripts/check-hand-rolled-alerts.sh       || FAILED=1
bash scripts/check-hand-rolled-stat-cards.sh   || FAILED=1
bash scripts/check-local-card-components.sh    || FAILED=1
bash scripts/check-hand-rolled-progress-bars.sh || FAILED=1
bash scripts/check-hand-rolled-breakdown-rows.sh || FAILED=1
bash scripts/check-hand-rolled-primary-buttons.sh || FAILED=1
bash scripts/check-hand-rolled-input-focus.sh    || FAILED=1
bash scripts/check-hand-rolled-charts.sh         || FAILED=1

if ((FAILED)); then
  echo "" >&2
  echo "Design-system checks failed. Use shared components from @/components/ui — see .cursor/rules/freelax-ui-design.mdc" >&2
  exit 1
fi

echo "check-design-system: OK"
