#!/usr/bin/env bash
# Ensure lib/typography.ts size tokens are safelisted (Tailwind only scans string literals).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TYPO="$ROOT/lib/typography.ts"
CONFIG="$ROOT/tailwind.config.js"

if [[ ! -f "$TYPO" ]]; then
  echo "check-typography-tokens: missing $TYPO" >&2
  exit 1
fi

missing=()
while IFS= read -r cls; do
  [[ -z "$cls" ]] && continue
  if ! grep -q "'${cls}'" "$CONFIG" && ! grep -q "\"${cls}\"" "$CONFIG"; then
    missing+=("$cls")
  fi
done < <(
  grep -oE 'text-text-[a-z]+|text-(micro|caption|xs|sm|base|lg|xl|2xl|3xl)|tracking-[a-z]+|leading-[a-z]+|font-[a-z]+' "$TYPO" | sort -u
)

if ((${#missing[@]} > 0)); then
  echo "Typography classes in lib/typography.ts missing from tailwind.config.js safelist:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "check-typography-tokens: OK"
