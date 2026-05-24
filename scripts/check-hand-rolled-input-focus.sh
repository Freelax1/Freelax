#!/usr/bin/env bash
# Fail when input/select/textarea focus styling is hand-rolled instead of Input primitives.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='focus-visible:ring-(1|2).*brand-primary|focus:ring.*brand-primary|focus:border-border-focus'

ALLOWLIST=(
  'components/ui/input.tsx'
  'components/ui/button.tsx'
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
done < <(rg -l "$PATTERN" app components --glob '!archive/**' --glob '*.tsx' 2>/dev/null || true)

if ((${#violations[@]} > 0)); then
  echo "Hand-rolled input focus rings found. Use Input/Textarea/Select from @/components/ui/input:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-input-focus: OK"
