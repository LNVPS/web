#!/usr/bin/env bash
# Publish news articles to Nostr relays.
#
# Usage:
#   publish.sh <nsec>                   # recursive diff across all article dirs
#   publish.sh [--diff] <dir> <nsec>    # single article directory
#
# Options:
#   --diff  Only publish variants whose content differs from what is already
#           on the relays. Always enabled in recursive mode.
#
# Examples:
#   ./docs/news/publish.sh $(cat ~/.nostr/lnvps-admin.nsec)
#   ./docs/news/publish.sh docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)
#   ./docs/news/publish.sh --diff docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RELAYS=(
  wss://relay.damus.io
  wss://nos.lol
  wss://relay.snort.social
  wss://relay.primal.net
)

usage() {
  echo "Usage:" >&2
  echo "  $0 <nsec>                    recursive diff across all article dirs" >&2
  echo "  $0 [--diff] <dir> <nsec>     single article directory" >&2
  exit 1
}

DIFF=false
RECURSIVE=false

# Parse args
args=()
for arg in "$@"; do
  case "$arg" in
    --diff) DIFF=true ;;
    *)      args+=("$arg") ;;
  esac
done

case ${#args[@]} in
  1)
    # publish.sh <nsec>  — recursive mode
    RECURSIVE=true
    DIFF=true
    NSEC="${args[0]}"
    ;;
  2)
    # publish.sh <dir> <nsec>
    DIR="${args[0]%/}"
    NSEC="${args[1]}"
    ;;
  *)
    usage
    ;;
esac

if ! command -v nak &>/dev/null; then
  echo "Error: 'nak' not found in PATH" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: 'jq' not found in PATH" >&2
  exit 1
fi

# Derive pubkey from nsec (needed for relay queries in diff mode)
PUBKEY=""
if [[ "$DIFF" == "true" ]]; then
  PUBKEY=$(nak key public "$NSEC" 2>/dev/null)
  if [[ -z "$PUBKEY" ]]; then
    echo "Error: could not derive public key from nsec" >&2
    exit 1
  fi
fi

# Fetch the current event for a given d-tag from relays.
# Prints the raw JSON event, or nothing if not found.
fetch_current_event() {
  local d_tag="$1"
  nak req -q \
    -k 30023 \
    -a "$PUBKEY" \
    -d "$d_tag" \
    -l 1 \
    "${RELAYS[@]}" 2>/dev/null | head -1
}

publish_variant() {
  local dir="$1"
  local lang="$2"
  local meta="${dir}/${lang}.metadata.json"
  local body="${dir}/${lang}.md"

  if [[ ! -f "$meta" ]]; then
    echo "  skip ${lang}: no ${lang}.metadata.json"
    return
  fi
  if [[ ! -f "$body" ]]; then
    echo "  skip ${lang}: no ${lang}.md"
    return
  fi

  local title d_tag local_body
  title=$(jq -r '.tags[] | select(.[0]=="title") | .[1]' "$meta")
  d_tag=$(jq -r '.tags[] | select(.[0]=="d") | .[1]' "$meta")
  local_body=$(cat "$body")

  if [[ "$DIFF" == "true" ]]; then
    echo "  checking [${lang}]: ${title}"
    local current_event
    current_event=$(fetch_current_event "$d_tag")

    if [[ -n "$current_event" ]]; then
      local remote_body remote_title
      remote_body=$(echo "$current_event" | jq -r '.content')
      remote_title=$(echo "$current_event" | jq -r '.tags[] | select(.[0]=="title") | .[1]')

      if [[ "$remote_body" == "$local_body" && "$remote_title" == "$title" ]]; then
        echo "  skip [${lang}]: unchanged"
        return
      else
        echo "  publishing [${lang}]: ${title} (changed)"
      fi
    else
      echo "  publishing [${lang}]: ${title} (not found on relays)"
    fi
  else
    echo "  publishing [${lang}]: ${title}"
  fi

  NOSTR_SECRET_KEY="$NSEC" nak event \
    -c "$local_body" \
    "${RELAYS[@]}" \
    < "$meta"
}

publish_dir() {
  local dir="$1"
  echo "=== $(basename "$dir") ==="

  # Publish en first, then all other language variants
  publish_variant "$dir" "en"
  for meta in "${dir}"/*.metadata.json; do
    local lang
    lang=$(basename "$meta" .metadata.json)
    [[ "$lang" == "en" ]] && continue
    publish_variant "$dir" "$lang"
  done

  echo ""
}

echo "Relays: ${RELAYS[*]}"
[[ "$DIFF" == "true" ]] && echo "Mode: diff (skip unchanged)"
echo ""

if [[ "$RECURSIVE" == "true" ]]; then
  mapfile -t dirs < <(find "$SCRIPT_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
  for dir in "${dirs[@]}"; do
    publish_dir "$dir"
  done
else
  if [[ ! -d "$DIR" ]]; then
    echo "Error: directory '$DIR' not found" >&2
    exit 1
  fi
  publish_dir "$DIR"
fi

echo "Done."
