#!/usr/bin/env bash
# translate.sh — Translate news articles using Ollama
#
# Usage:
#   ./docs/news/translate.sh [--dir <article-dir>] [--url <ollama-url>] [--model <model>] [--force]
#
# Options:
#   --dir   Single article directory to translate (default: all articles under docs/news/)
#   --url   Ollama base URL (default: http://localhost:11434/v1)
#   --model Ollama model name (default: translategemma:27b)
#   --force Re-translate even if output files already exist
#
# Target languages are read from src/locales-metadata.json (all except "en").
#
# Requires: curl, jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEWS_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCALES_METADATA="$REPO_ROOT/src/locales-metadata.json"

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434/v1}"
MODEL="translategemma:27b"
FORCE=false
SINGLE_DIR=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)   OLLAMA_URL="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    --dir)   SINGLE_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Map BCP-47 code -> English language name (for translation prompts)
declare -A LANG_ENGLISH_NAMES=(
  [ar]="Arabic"
  [de]="German"
  [es]="Spanish"
  [fr]="French"
  [ja]="Japanese"
  [ko]="Korean"
  [pt]="Portuguese"
  [ru]="Russian"
  [tr]="Turkish"
  [zh]="Chinese"
)

# Build LANGUAGES map from locales-metadata.json, excluding "en"
declare -A LANGUAGES
while IFS="=" read -r code _; do
  if [[ "$code" != "en" ]]; then
    if [[ -n "${LANG_ENGLISH_NAMES[$code]+x}" ]]; then
      LANGUAGES[$code]="${LANG_ENGLISH_NAMES[$code]}"
    else
      echo "Warning: no English name mapping for locale '$code', skipping" >&2
    fi
  fi
done < <(jq -r 'keys[] | . + "=1"' "$LOCALES_METADATA")

# Auto-translation disclaimer, keyed by locale code
declare -A DISCLAIMERS=(
  [ar]="*تمت ترجمة هذه المقالة تلقائيًا من الإنجليزية.*"
  [de]="*Dieser Beitrag wurde automatisch aus dem Englischen übersetzt.*"
  [es]="*Esta publicación fue traducida automáticamente del inglés.*"
  [fr]="*Cet article a été traduit automatiquement depuis l'anglais.*"
  [ja]="*この投稿は英語から自動翻訳されました。*"
  [ko]="*이 게시물은 영어에서 자동으로 번역되었습니다.*"
  [pt]="*Esta publicação foi traduzida automaticamente do inglês.*"
  [ru]="*Эта публикация была автоматически переведена с английского языка.*"
  [tr]="*Bu gönderi İngilizceden otomatik olarak çevrilmiştir.*"
  [zh]="*本文由英文自动翻译而来。*"
)

# Translate a string via Ollama chat completions
translate_text() {
  local lang_name="$1"
  local text="$2"
  local is_markdown="$3"  # "true" or "false"

  if [[ "$is_markdown" == "true" ]]; then
    local system_prompt="You are a professional translator. Translate the following Markdown text to ${lang_name}. Preserve all Markdown formatting, code blocks, inline code, and links exactly as-is. Output only the translated text with no explanations or extra commentary."
  else
    local system_prompt="You are a professional translator. Translate the following text to ${lang_name}. Output only the translated text with no explanations or extra commentary."
  fi

  local payload
  payload=$(jq -n \
    --arg model "$MODEL" \
    --arg system "$system_prompt" \
    --arg user "$text" \
    '{model: $model, messages: [{role: "system", content: $system}, {role: "user", content: $user}], stream: false}')

  local response
  response=$(curl -sf "${OLLAMA_URL}/chat/completions" \
    -H "Content-Type: application/json" \
    -d "$payload")

  echo "$response" | jq -r '.choices[0].message.content'
}

# Process a single article directory
translate_article() {
  local article_dir="$1"
  local article_name
  article_name="$(basename "$article_dir")"

  local en_md="$article_dir/en.md"
  local en_meta="$article_dir/en.metadata.json"

  if [[ ! -f "$en_md" || ! -f "$en_meta" ]]; then
    echo "  [skip] No en.md or en.metadata.json found"
    return
  fi

  local en_title
  en_title=$(jq -r '.tags[] | select(.[0] == "title") | .[1]' "$en_meta")
  local d_tag
  d_tag=$(jq -r '.tags[] | select(.[0] == "d") | .[1]' "$en_meta")
  local published_at
  published_at=$(jq -r '.tags[] | select(.[0] == "published_at") | .[1]' "$en_meta")
  local en_body
  en_body=$(cat "$en_md")

  for lang_code in "${!LANGUAGES[@]}"; do
    local lang_name="${LANGUAGES[$lang_code]}"
    local out_md="$article_dir/${lang_code}.md"
    local out_meta="$article_dir/${lang_code}.metadata.json"

    local existing_content
    existing_content=$(tr -d '[:space:]' < "$out_md" 2>/dev/null || true)
    if [[ "$FORCE" == "false" && -f "$out_md" && -n "$existing_content" && -f "$out_meta" ]]; then
      echo "  [skip] ${lang_code} already exists"
      continue
    fi

    echo "  [translating] ${lang_code} (${lang_name})..."

    # Translate body
    local translated_body
    translated_body=$(translate_text "$lang_name" "$en_body" "true")

    if [[ -z "$translated_body" ]]; then
      echo "  [error] ${lang_code}: empty response from Ollama, skipping" >&2
      continue
    fi

    # Translate title
    local translated_title
    translated_title=$(translate_text "$lang_name" "$en_title" "false")

    if [[ -z "$translated_title" ]]; then
      echo "  [error] ${lang_code}: empty title response from Ollama, skipping" >&2
      continue
    fi

    # Prepend auto-translation disclaimer
    local disclaimer="${DISCLAIMERS[$lang_code]:-*This post was automatically translated from English.*}"

    # Write markdown with disclaimer at the top
    printf '%s\n\n%s\n' "$disclaimer" "$translated_body" > "$out_md"

    # Write metadata
    jq -n \
      --arg d "${d_tag}-${lang_code}" \
      --arg title "$translated_title" \
      --arg published_at "$published_at" \
      --arg lang "$lang_code" \
      '{
        kind: 30023,
        tags: [
          ["d", $d],
          ["title", $title],
          ["published_at", $published_at],
          ["L", "ISO-639-1"],
          ["l", $lang, "ISO-639-1"]
        ]
      }' > "$out_meta"

    echo "  [done] ${lang_code}: $out_md, $out_meta"
  done
}

# Collect article directories to process
if [[ -n "$SINGLE_DIR" ]]; then
  dirs=("$SINGLE_DIR")
else
  mapfile -t dirs < <(find "$NEWS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
fi

echo "Ollama URL: $OLLAMA_URL"
echo "Model:      $MODEL"
echo "Languages:  ${!LANGUAGES[*]}"
echo ""

for dir in "${dirs[@]}"; do
  echo "=== $(basename "$dir") ==="
  translate_article "$dir"
done

echo ""
echo "Done."
