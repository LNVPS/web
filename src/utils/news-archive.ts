import type { NostrEvent } from "@snort/system";

/**
 * The article set generated from `docs/news/` at build time.
 *
 * Only the SSR entry sets this: the client can reach the relays itself, and the
 * archive is ~350 KB of markdown that has no business in the browser bundle.
 */
let archive: Array<NostrEvent> = [];

export function setNewsArchive(events: Array<NostrEvent>) {
  archive = events;
}

export function getNewsArchive(): Array<NostrEvent> {
  return archive;
}

/**
 * Relay copies of an article win over the bundled one — they are what we
 * actually published, edits included. The archive only fills in the articles a
 * relay no longer serves.
 */
export function mergeNewsWithArchive(
  relayEvents: Array<NostrEvent> | undefined,
): Array<NostrEvent> {
  const byDTag = new Map<string, NostrEvent>();
  for (const ev of getNewsArchive()) {
    byDTag.set(dTag(ev), ev);
  }
  for (const ev of relayEvents ?? []) {
    byDTag.set(dTag(ev), ev);
  }
  return [...byDTag.values()];
}

function dTag(ev: NostrEvent): string {
  return ev.tags.find((t) => t[0] === "d")?.[1] ?? ev.id;
}
