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

## Publishing

Use `publish.sh` to sign and publish all language variants in a directory:

```bash
./docs/news/publish.sh docs/news/202602201006 $(cat ~/.nostr/lnvps-admin.nsec)
```

Or manually for a single variant:

```bash
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) nak event \
  -c "$(cat docs/news/202602201006/zh.md)" \
  wss://relay.damus.io wss://nos.lol \
  < docs/news/202602201006/zh.metadata.json
```

The script publishes `en` first, then all other language variants found in the directory, to the following relays: `relay.damus.io`, `nos.lol`, `relay.snort.social`, `relay.primal.net`.
