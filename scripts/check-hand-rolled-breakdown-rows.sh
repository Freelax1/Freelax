#!/usr/bin/env bash
# Fail when pages define local breakdown Row components instead of BreakdownRow.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='function Row\(\{ label'

ALLOWLIST=(
  'components/ui/breakdown-row.tsx'
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
done < <(rg -l "$PATTERN" app components --glob '!archive/**' 2>/dev/null || true)

if ((${#violations[@]} > 0)); then
  echo "Local breakdown Row components found. Use BreakdownRow from @/components/ui/breakdown-row instead:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-breakdown-rows: OK"
