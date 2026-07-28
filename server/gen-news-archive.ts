/**
 * Generates `src/news-archive.json` from the article sources in `docs/news/`.
 *
 * News posts are published to relays as kind:30023 events, but a relay is free
 * to drop an old addressable event and three of the four we read already have:
 * the archive is only complete on one of them, so the site rendered whatever
 * subset happened to answer. The posts are in the repo, so bundle them and let
 * the relay copies win when they are there — the site's own archive should not
 * depend on someone else's retention policy.
 *
 * The generated events carry the `d` tag as their id and no signature: they are
 * render input for the loaders, never republished and never fed to the Nostr
 * system.
 *
 * Run via `bun server/gen-news-archive.ts` (wired into the build script, and
 * called by the dev server so `bun server/dev.ts` works in a fresh checkout).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const NEWS_DIR = join(ROOT, "docs", "news");
const OUT_PATH = join(ROOT, "src", "news-archive.json");

/** Hex public key of the LNVPS account the posts are published under. */
const PUBKEY =
  "fcd818454002a6c47a980393f0549ac6e629d28d5688114bb60d831b5c1832a7";

interface ArchiveEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
}

function readArticle(dir: string, lang: string): ArchiveEvent | undefined {
  const metaPath = join(dir, `${lang}.metadata.json`);
  const bodyPath = join(dir, `${lang}.md`);
  const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as {
    kind: number;
    tags: Array<Array<string>>;
  };
  const content = readFileSync(bodyPath, "utf-8");

  const publishedAt = meta.tags.find((t) => t[0] === "published_at")?.[1];
  if (!publishedAt) {
    console.warn(`skipped ${metaPath}: no published_at tag`);
    return undefined;
  }

  const d = meta.tags.find((t) => t[0] === "d")?.[1];
  if (!d) {
    console.warn(`skipped ${metaPath}: no d tag`);
    return undefined;
  }

  return {
    id: d,
    pubkey: PUBKEY,
    created_at: Number(publishedAt),
    kind: meta.kind,
    tags: meta.tags,
    content,
    sig: "",
  };
}

export function generateNewsArchive(): number {
  const events: Array<ArchiveEvent> = [];
  for (const entry of readdirSync(NEWS_DIR).sort()) {
    const dir = join(NEWS_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;

    for (const file of readdirSync(dir).sort()) {
      const lang = file.match(/^([a-z]{2})\.metadata\.json$/)?.[1];
      if (!lang) continue;
      const ev = readArticle(dir, lang);
      if (ev) events.push(ev);
    }
  }

  events.sort((a, b) => b.created_at - a.created_at);
  writeFileSync(OUT_PATH, `${JSON.stringify(events, null, 2)}\n`);
  return events.length;
}

if (import.meta.main) {
  console.log(`wrote ${OUT_PATH} (${generateNewsArchive()} events)`);
}
