import { NostrEvent } from "@snort/system";

export function getNewsTitle(ev: NostrEvent): string | undefined {
  return ev.tags.find((a) => a[0] === "title")?.[1];
}

export function getNewsSlug(ev: NostrEvent): string {
  return ev.tags.find((a) => a[0] === "d")?.[1] ?? ev.id;
}

export function getNewsPublishedAt(ev: NostrEvent): number {
  return Number(
    ev.tags.find((a) => a[0] === "published_at")?.[1] ?? ev.created_at,
  );
}

export function getNewsExcerpt(ev: NostrEvent, maxLength = 160): string {
  const summary = ev.tags.find((a) => a[0] === "summary")?.[1]?.trim();
  if (summary) {
    return summary;
  }

  const plainText = ev.content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`;
}
