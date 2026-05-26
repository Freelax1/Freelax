#!/usr/bin/env bash
# Fail when Recharts bar charts are hand-rolled instead of MonthlyIncomeChart.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALLOWLIST=(
  'components/ui/monthly-income-chart.tsx'
)

violations=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  allowed=false
  for entry in "${ALLOWLIST[@]}"; do
    if [[ "$file" == "$entry" ]]; then
      allowed=true
      break
    fi
  done
  if ! $allowed; then
    violations+=("$file")
  fi
done < <(rg -l "from 'recharts'" app components --glob '!archive/**' 2>/dev/null || true)

if ((${#violations[@]} > 0)); then
  echo "Hand-rolled Recharts imports found. Use MonthlyIncomeChart from @/components/ui/monthly-income-chart instead:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-charts: OK"
