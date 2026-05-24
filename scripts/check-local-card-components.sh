#!/usr/bin/env bash
# Fail when pages define local Card/StatCard components instead of shared UI primitives.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='function (StatCard|Card)\(\{'

ALLOWLIST=(
  'components/ui/card.tsx'
  'components/ui/stat-card.tsx'
  'components/ui/section-card.tsx'
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
  echo "Local Card/StatCard components found. Use shared UI from @/components/ui instead:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-local-card-components: OK"
