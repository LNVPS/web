# News Posts

News posts are published as Nostr long-form content events (NIP-23, `kind:30023`) by the LNVPS profile.

## Directory Structure

Each article lives in its own directory named after the `published_at` timestamp formatted as `YYYYMMDDHHMM` (UTC). This keeps articles sorted chronologically in the filesystem. The article slug (Nostr `d` tag) lives inside `metadata.json`.

```
news/
  202602201006/
    en.metadata.json     ← Nostr event template for the English original
    en.md                ← English body (raw markdown, no frontmatter)
    fr.metadata.json     ← Nostr event template for the French translation
    fr.md                ← French translation body
    de.metadata.json
    de.md
    ...
```

## en.metadata.json

The English `en.metadata.json` is a partial Nostr event template ready for signing and publishing:

```json
{
  "kind": 30023,
  "tags": [
    ["d", "web-console"],
    ["title", "Web Console"],
    ["published_at", "1771582008"]
  ]
}
```

## Translation metadata ({lang}.metadata.json)

Translations use a language-suffixed `d` tag (required — addressable events are unique per `kind:pubkey:d`) and NIP-32 ISO-639-1 language labels:

```json
{
  "kind": 30023,
  "tags": [
    ["d", "web-console-zh"],
    ["title", "网络控制台"],
    ["published_at", "1771582008"],
    ["L", "ISO-639-1"],
    ["l", "zh", "ISO-639-1"]
  ]
}
```

The client groups articles by stripping the `-{lang}` suffix from the `d` tag and picks the best locale match automatically.

## Translation

Use `translate.sh` to auto-translate articles using Ollama. It generates `{lang}.md` and `{lang}.metadata.json` for each target language, skipping files that already exist.

```bash
# Translate all articles (ru, ar, tr, ko by default)
./docs/news/translate.sh

# Translate a single article directory
./docs/news/translate.sh --dir docs/news/202602201006

# Override Ollama URL or model
./docs/news/translate.sh --url http://10.0.0.1:11434/v1 --model llama3:8b

# Re-translate even if output files already exist
./docs/news/translate.sh --force
```

Target languages are driven by `src/locales-metadata.json` (all locales except `en`). Adding a new language to that file will automatically include it on the next run. Files that already exist are skipped unless `--force` is passed.

## Publishing

Use `publish.sh` to sign and publish articles to Nostr relays.

```bash
# Publish all articles (recursive diff — skips unchanged variants)
./docs/news/publish.sh $(cat ~/.nostr/lnvps-admin.nsec)

# Publish a single article directory (no diff, publishes all variants)
./docs/news/publish.sh docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)

# Publish a single article directory, skipping unchanged variants
./docs/news/publish.sh --diff docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)
```

In diff mode the script fetches the current `kind:30023` event for each `d-tag` from the relays, compares body and title against the local files, and skips publishing if they match.

Or manually for a single variant:

```bash
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) nak event \
  -c "$(cat docs/news/202602201006/zh.md)" \
  wss://relay.damus.io wss://nos.lol \
  < docs/news/202602201006/zh.metadata.json
```

The script publishes `en` first, then all other language variants found in the directory, to the following relays: `relay.damus.io`, `nos.lol`, `relay.snort.social`, `relay.primal.net`.
