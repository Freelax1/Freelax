#!/usr/bin/env bash
# Fail when form/detail section shells are hand-rolled instead of FormSection / DetailSection / CollapsibleSection.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='bg-surface-card rounded-xl border border-border-default p-6'

ALLOWLIST=(
  'components/ui/form-section.tsx'
  'components/ui/detail-section.tsx'
  'components/ui/collapsible-section.tsx'
  'components/ui/section-card.tsx'
  'components/ui/content-skeletons.tsx'
  'app/(dashboard)/dashboard/components/this-month.tsx'
  'app/(dashboard)/dashboard/components/whats-coming.tsx'
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
done < <(rg -l "$PATTERN" app --glob '!archive/**' 2>/dev/null || true)

if ((${#violations[@]} > 0)); then
  echo "Hand-rolled form/detail section shells found. Use FormSection, DetailSection, or CollapsibleSection from @/components/ui:"
  printf '  - %s\n' "${violations[@]}"
  exit 1
fi

echo "check-hand-rolled-form-sections: OK"
