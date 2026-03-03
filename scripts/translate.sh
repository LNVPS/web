#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCALES_DIR="$SCRIPT_DIR/../src/locales"
INPUT="$LOCALES_DIR/en.json"

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434/v1}"
MODEL="${OLLAMA_MODEL:-translategemma:27b}"

declare -A LANGUAGES=(
  [fr]="French"
  [de]="German"
  [es]="Spanish"
  [pt]="Portuguese"
  [ja]="Japanese"
  [zh]="Chinese"
)

if ! command -v ollama_intl &>/dev/null; then
  echo "error: ollama_intl not found in PATH. Install with: cargo install --git https://github.com/v0l/ollama_intl"
  exit 1
fi

echo "Translating $INPUT using $OLLAMA_URL ($MODEL)"
echo "Languages: ${!LANGUAGES[*]}"
echo ""

pids=()
for code in "${!LANGUAGES[@]}"; do
  lang="${LANGUAGES[$code]}"
  echo "Starting: $lang ($code)"
  ollama_intl \
    -u "$OLLAMA_URL" \
    -m "$MODEL" \
    -i "$INPUT" \
    -o "$LOCALES_DIR" \
    --target-lang "$lang" \
    --target-code "$code" &
  pids+=($!)
done

for pid in "${pids[@]}"; do
  wait "$pid"
done

echo ""
echo "Done. Files written to $LOCALES_DIR:"
ls -1 "$LOCALES_DIR"
