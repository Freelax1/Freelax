#!/usr/bin/env bash
# Fail when 5px progress tracks are hand-rolled instead of using ProgressBar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='h-\[5px\].*rounded-full overflow-hidden'

ALLOWLIST=(
  'components/ui/progress-bar.tsx'
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
  echo "Hand-rolled progress bars found. Use ProgressBar from @/components/ui/progress-bar instead:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-progress-bars: OK"
