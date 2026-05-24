#!/usr/bin/env bash
# Fail when primary CTA styling is hand-rolled on raw <button> instead of Button.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

violations=()

ALLOWLIST=(
  'components/ui/button.tsx'
  # Expanding FAB — custom hover width animation
  'components/tax-qa-chat.tsx'
)

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  violations+=("$file")
done < <(rg -l 'className=\{btnClass\}' app components --glob '!archive/**' 2>/dev/null || true)

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
done < <(rg -l '<button[^>]*bg-brand-primary text-white' app components --glob '!archive/**' 2>/dev/null || true)

if ((${#violations[@]} > 0)); then
  deduped=($(printf '%s\n' "${violations[@]}" | sort -u))
  echo "Hand-rolled primary buttons found. Use Button from @/components/ui/button instead:"
  printf '  - %s\n' "${deduped[@]}"
  exit 1
fi

echo "check-hand-rolled-primary-buttons: OK"
