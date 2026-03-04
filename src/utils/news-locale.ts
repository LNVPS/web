import { NostrEvent } from "@snort/system";

/**
 * Read the ISO-639-1 language tag from a NIP-32 self-label on an event.
 * Articles tag themselves with ["L", "ISO-639-1"] + ["l", "<code>", "ISO-639-1"].
 * Returns undefined when no language label is present (treat as "en").
 */
export function getArticleLang(ev: NostrEvent): string | undefined {
  const label = ev.tags.find((t) => t[0] === "l" && t[2] === "ISO-639-1");
  return label?.[1];
}

/**
 * Derive the canonical slug from a `d` tag by stripping a known language suffix.
 *
 * Convention: translated articles use `d` tags of the form `<slug>-<lang>`,
 * e.g. "my-article-zh" or "my-article-fr". The English original uses "my-article"
 * (no suffix) or optionally "my-article-en".
 *
 * This lets us group all translations of the same article together while keeping
 * each `d` tag globally unique (required for kind:30023 addressable events).
 */
export function articleSlug(ev: NostrEvent): string {
  const d = ev.tags.find((t) => t[0] === "d")?.[1] ?? ev.id;
  const lang = getArticleLang(ev);
  if (lang && lang !== "en" && d.endsWith(`-${lang}`)) {
    return d.slice(0, -(lang.length + 1));
  }
  // Strip an explicit "-en" suffix too, so "my-article-en" and "my-article" group together
  if (d.endsWith("-en")) {
    return d.slice(0, -3);
  }
  return d;
}

/**
 * Given a set of long-form article events (kind:30023), return one event per
 * unique article (grouped by canonical slug), preferring the caller's locale,
 * then "en", then unlabelled, then any.
 */
export function filterArticlesByLocale(
  events: NostrEvent[],
  locale: string,
): NostrEvent[] {
  // Group by canonical slug so all translations of an article are together
  const groups = new Map<string, NostrEvent[]>();
  for (const ev of events) {
    const slug = articleSlug(ev);
    const group = groups.get(slug) ?? [];
    group.push(ev);
    groups.set(slug, group);
  }

  const result: NostrEvent[] = [];
  for (const group of groups.values()) {
    const pick = pickBestLocale(group, locale);
    if (pick) result.push(pick);
  }
  return result;
}

function pickBestLocale(
  group: NostrEvent[],
  locale: string,
): NostrEvent | undefined {
  if (group.length === 0) return undefined;
  if (group.length === 1) return group[0];

  // Prefer exact locale match
  const exact = group.find((ev) => getArticleLang(ev) === locale);
  if (exact) return exact;

  // Fall back to English
  const english = group.find((ev) => getArticleLang(ev) === "en");
  if (english) return english;

  // Fall back to unlabelled (assumed English)
  const unlabelled = group.find((ev) => getArticleLang(ev) === undefined);
  if (unlabelled) return unlabelled;

  // Last resort: any version
  return group[0];
}
