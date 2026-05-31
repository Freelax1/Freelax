#!/usr/bin/env bash
# Status palette only defines 50/100/200/500/600/700/800 — not 300 or 400.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='(danger|warning|success)-(300|400)'

violations=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  violations+=("$line")
done < <(
  grep -rEn "$PATTERN" app components \
    --include='*.tsx' --include='*.ts' \
    --exclude-dir=archive 2>/dev/null || true
)

if ((${#violations[@]} > 0)); then
  echo "Undefined status color steps (use 50/100/200/500/600/700/800 from tailwind.config.js):"
  printf '  %s\n' "${violations[@]}"
  exit 1
fi

echo "check-status-color-steps: OK"
