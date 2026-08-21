/**
 * Generates sitemap.xml from the static routes, the app catalog and every news
 * article in `docs/news/`.
 *
 * The hand-maintained file listed none of the articles and went stale against
 * the catalog, so both moving parts are read from their source: the articles
 * from `src/news-archive.json`, the app slugs (`name`, the URL/DNS-safe field
 * `/apps/:slug` routes on — `LNVPS/web#94`) from the public catalog endpoint.
 * A build with no catalog fails rather than publishing a sitemap that quietly
 * drops product pages.
 *
 * Run via `bun server/gen-sitemap.ts` (wired into the build script).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const ARCHIVE_PATH = join(ROOT, "src", "news-archive.json");
const SITE_URL = "https://lnvps.net";
const APPS_URL =
  process.env.SITEMAP_APPS_URL ?? "https://api.lnvps.net/api/v1/apps";

// Directories that should receive the generated sitemap.
const OUT_DIRS = [join(ROOT, "public"), join(ROOT, "dist", "client")];

export interface StaticEntry {
  path: string;
  changefreq: string;
  priority: string;
}

export const STATIC_ENTRIES: Array<StaticEntry> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/apps", changefreq: "weekly", priority: "0.9" },
  { path: "/blossom-server-hosting", changefreq: "monthly", priority: "0.9" },
  { path: "/nostr-relay-hosting", changefreq: "monthly", priority: "0.9" },
  { path: "/lightning-node-vps", changefreq: "monthly", priority: "0.9" },
  { path: "/bitcoin-node-hosting", changefreq: "monthly", priority: "0.9" },
  { path: "/vps-ireland", changefreq: "monthly", priority: "0.8" },
  { path: "/vps-london", changefreq: "monthly", priority: "0.8" },
  { path: "/vps-canada", changefreq: "monthly", priority: "0.8" },
  { path: "/news", changefreq: "weekly", priority: "0.8" },
  { path: "/status", changefreq: "hourly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  // Listed despite being an app surface rather than a page of content: it is
  // the only support channel that answers immediately and without an account,
  // and "lnvps support" is a query someone types before they have either.
  { path: "/contact/chat", changefreq: "monthly", priority: "0.5" },
  { path: "/tos", changefreq: "monthly", priority: "0.4" },
];

export interface ArchiveEvent {
  tags: Array<Array<string>>;
}

function tag(ev: ArchiveEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1];
}

/** ISO-639-1 self-label (NIP-32), absent on the English originals. */
function lang(ev: ArchiveEvent): string | undefined {
  return ev.tags.find((t) => t[0] === "l" && t[2] === "ISO-639-1")?.[1];
}

function xmlEntry(
  path: string,
  opts: {
    changefreq: string;
    priority: string;
    lastmod?: string;
    alternates?: Array<[string, string]>;
  },
): string {
  const links = (opts.alternates ?? []).map(
    ([code, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${SITE_URL}${href}"/>`,
  );
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    opts.lastmod ? `    <lastmod>${opts.lastmod}</lastmod>` : undefined,
    `    <changefreq>${opts.changefreq}</changefreq>`,
    `    <priority>${opts.priority}</priority>`,
    ...links,
    "  </url>",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

/**
 * Every language variant is its own URL, and each one carries the whole
 * alternate set including itself: hreflang without a return tag on the target
 * page is discarded, which would leave the translations undiscoverable.
 */
function newsEntries(archive: Array<ArchiveEvent>): Array<string> {
  const groups = new Map<string, Array<ArchiveEvent>>();
  for (const ev of archive) {
    const d = tag(ev, "d");
    if (!d) continue;
    const code = lang(ev);
    const slug =
      code && d.endsWith(`-${code}`) ? d.slice(0, -(code.length + 1)) : d;
    groups.set(slug, [...(groups.get(slug) ?? []), ev]);
  }

  const entries: Array<string> = [];
  for (const [slug, group] of groups) {
    const original = group.find((ev) => lang(ev) === undefined);
    const alternates: Array<[string, string]> = group
      .map((ev): [string, string] => [
        lang(ev) ?? "en",
        `/news/${tag(ev, "d")}`,
      ])
      .sort(([a], [b]) => a.localeCompare(b));
    if (original) {
      alternates.push(["x-default", `/news/${slug}`]);
    }

    for (const ev of group) {
      const d = tag(ev, "d");
      const publishedAt = tag(ev, "published_at");
      if (!d || !publishedAt) continue;
      entries.push(
        xmlEntry(`/news/${d}`, {
          changefreq: "monthly",
          priority: lang(ev) === undefined ? "0.7" : "0.5",
          lastmod: new Date(Number(publishedAt) * 1000)
            .toISOString()
            .slice(0, 10),
          alternates,
        }),
      );
    }
  }
  return entries;
}

export function buildSitemapXml(
  archive: Array<ArchiveEvent>,
  appSlugs: Array<string>,
): string {
  const entries = [
    ...STATIC_ENTRIES.map((e) =>
      xmlEntry(e.path, { changefreq: e.changefreq, priority: e.priority }),
    ),
    ...appSlugs.map((slug) =>
      xmlEntry(`/apps/${slug}`, { changefreq: "monthly", priority: "0.8" }),
    ),
    ...newsEntries(archive),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

async function fetchAppSlugs(): Promise<Array<string>> {
  const res = await fetch(APPS_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${APPS_URL} returned ${res.status}`);
  const body = (await res.json()) as { data?: Array<{ name: string }> };
  const slugs = (body.data ?? [])
    .map((a) => a.name)
    .sort((a, b) => a.localeCompare(b));
  if (slugs.length === 0) throw new Error(`${APPS_URL} returned no apps`);
  return slugs;
}

const RETRY_ATTEMPTS = 3;

/**
 * Retry a flaky call rather than fail the build on the first attempt. The
 * scrubbing path in front of the API drops some SYN packets under concurrent
 * connection bursts, so a timeout here is often gone on the next try (the
 * Docker registry login in `build-deploy.yml` retries the same flake).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { delayMs = 2000 }: { delayMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_ATTEMPTS) throw err;
      // Otherwise identical to a fast first-try success in the build log.
      console.warn(
        `retrying after a failed attempt (${attempt}/${RETRY_ATTEMPTS}): ${err}`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

if (import.meta.main) {
  const archive = JSON.parse(
    readFileSync(ARCHIVE_PATH, "utf-8"),
  ) as Array<ArchiveEvent>;
  const appSlugs = await withRetry(fetchAppSlugs);
  const xml = buildSitemapXml(archive, appSlugs);

  for (const dir of OUT_DIRS) {
    if (!existsSync(dir)) continue;
    const out = join(dir, "sitemap.xml");
    writeFileSync(out, xml);
    console.log(`wrote ${out}`);
  }
  console.log(
    `sitemap: ${STATIC_ENTRIES.length} static + ${appSlugs.length} apps + ${archive.length} news URLs`,
  );
}
