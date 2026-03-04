#!/usr/bin/env bash
# Publish a news article directory to Nostr relays.
# Publishes all language variants found in the directory.
#
# Usage: publish.sh <dir> <nsec>
#
# Example:
#   ./publish.sh docs/news/202602201006 nsec1...
#   ./publish.sh docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)

set -euo pipefail

RELAYS=(
  wss://relay.damus.io
  wss://nos.lol
  wss://relay.snort.social
  wss://relay.primal.net
)

usage() {
  echo "Usage: $0 <dir> <nsec>" >&2
  exit 1
}

[[ $# -ne 2 ]] && usage

DIR="${1%/}"
NSEC="$2"

if [[ ! -d "$DIR" ]]; then
  echo "Error: directory '$DIR' not found" >&2
  exit 1
fi

if ! command -v nak &>/dev/null; then
  echo "Error: 'nak' not found in PATH" >&2
  exit 1
fi

publish_variant() {
  local lang="$1"
  local meta="${DIR}/${lang}.metadata.json"
  local body="${DIR}/${lang}.md"

  if [[ ! -f "$meta" ]]; then
    echo "  skip ${lang}: no ${lang}.metadata.json"
    return
  fi
  if [[ ! -f "$body" ]]; then
    echo "  skip ${lang}: no ${lang}.md"
    return
  fi

  local title
  title=$(jq -r '.tags[] | select(.[0]=="title") | .[1]' "$meta")
  echo "  publishing [${lang}]: ${title}"

  NOSTR_SECRET_KEY="$NSEC" nak event \
    -c "$(cat "$body")" \
    "${RELAYS[@]}" \
    < "$meta"
}

echo "Publishing: $DIR"
echo "Relays: ${RELAYS[*]}"
echo ""

# Publish en first, then all other language variants
publish_variant "en"
for meta in "${DIR}"/*.metadata.json; do
  lang=$(basename "$meta" .metadata.json)
  [[ "$lang" == "en" ]] && continue
  publish_variant "$lang"
done

echo ""
echo "Done."
