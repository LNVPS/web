# News Posts

News posts are published as Nostr long-form content events (NIP-23) by the LNVPS profile. The source markdown is maintained here for drafting and version control.

## File Format

Each file uses the naming convention `{published_at}-{dtag}.md` where:

- `published_at` is a Unix timestamp (seconds)
- `dtag` is a unique identifier for the Nostr event `d` tag

### Frontmatter

```yaml
---
title: "Post Title"
published_at: 1771927035
dtag: short-slug
---
```

| Field          | Description                                            |
| -------------- | ------------------------------------------------------ |
| `title`        | Post title (maps to the Nostr `title` tag)             |
| `published_at` | Unix timestamp in seconds (maps to `published_at` tag) |
| `dtag`         | Unique slug (maps to the Nostr `d` tag)                |

### Body

Standard markdown. Keep posts concise and conversational. Images can be hosted on Nostr-compatible image hosts (nostr.build, blossom, etc.).

## Publishing

Posts are published to Nostr relays as `kind:30023` (LongFormTextNote) events using the LNVPS profile key. Use a NIP-23 compatible client such as Habla.news or Yakihonne to publish.
