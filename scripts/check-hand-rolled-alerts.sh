#!/usr/bin/env bash
# Fail when block-level alert styling is hand-rolled instead of using Alert.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='bg-(warning|danger|success)-50 border border-(warning|danger|success)-200 rounded-xl'

ALLOWLIST=(
  'components/ui/alert.tsx'
  # Compound AI insight panel (custom header + dismiss control)
  'app/(dashboard)/dashboard/components/this-month.tsx'
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
  echo "Hand-rolled alert banners found. Use Alert from @/components/ui/alert instead:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-alerts: OK"
