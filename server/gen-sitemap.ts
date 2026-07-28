/**
 * Generates sitemap.xml from the static routes plus every news article in
 * `docs/news/`.
 *
 * The news half is generated because the archive grows on its own: a
 * hand-maintained file listed five URLs and none of the posts, so the only
 * non-transactional content we publish was undiscoverable. Static entries stay
 * written here; the app catalog is still a hand-kept list rather than the API
 * (`LNVPS/web#18`).
 *
 * Run via `bun server/gen-sitemap.ts` (wired into the build script).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const ARCHIVE_PATH = join(ROOT, "src", "news-archive.json");
const SITE_URL = "https://lnvps.net";

// Directories that should receive the generated sitemap.
const OUT_DIRS = [join(ROOT, "public"), join(ROOT, "dist", "client")];

interface StaticEntry {
  path: string;
  changefreq: string;
  priority: string;
}

const STATIC_ENTRIES: Array<StaticEntry> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/apps", changefreq: "weekly", priority: "0.9" },
  // One entry per app in the catalog, hand-maintained: add a line when an app
  // is added. LNVPS/web#18 wants these sourced from /api/v1/apps.
  { path: "/apps/1", changefreq: "monthly", priority: "0.8" },
  { path: "/apps/2", changefreq: "monthly", priority: "0.8" },
  { path: "/apps/3", changefreq: "monthly", priority: "0.8" },
  { path: "/apps/4", changefreq: "monthly", priority: "0.8" },
  { path: "/apps/5", changefreq: "monthly", priority: "0.8" },
  { path: "/blossom-server-hosting", changefreq: "monthly", priority: "0.9" },
  { path: "/news", changefreq: "weekly", priority: "0.8" },
  { path: "/status", changefreq: "hourly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/tos", changefreq: "monthly", priority: "0.4" },
];

interface ArchiveEvent {
  tags: Array<Array<string>>;
}

function tag(ev: ArchiveEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1];
}

/** ISO-639-1 self-label (NIP-32), absent on the English originals. */
function lang(ev: ArchiveEvent): string | undefined {
  return ev.tags.find((t) => t[0] === "l" && t[2] === "ISO-639-1")?.[1];
}

const archive = JSON.parse(
  readFileSync(ARCHIVE_PATH, "utf-8"),
) as Array<ArchiveEvent>;

// A translated article is a distinct `d` tag and so a distinct URL, but it is
// the same page in another language: list the originals and hang the
// translations off them as hreflang alternates.
const originals = archive.filter((ev) => lang(ev) === undefined);
const alternates = new Map<string, Array<[string, string]>>();
for (const ev of archive) {
  const code = lang(ev);
  const d = tag(ev, "d");
  if (!code || !d) continue;
  const slug = d.endsWith(`-${code}`) ? d.slice(0, -(code.length + 1)) : d;
  alternates.set(slug, [...(alternates.get(slug) ?? []), [code, d]]);
}

function urlEntry(
  path: string,
  opts: {
    changefreq: string;
    priority: string;
    lastmod?: string;
    links?: Array<[string, string]>;
  },
): string {
  const links = (opts.links ?? [])
    .map(
      ([code, slug]) =>
        `    <xhtml:link rel="alternate" hreflang="${code}" href="${SITE_URL}/news/${slug}"/>`,
    )
    .join("\n");
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    opts.lastmod ? `    <lastmod>${opts.lastmod}</lastmod>` : undefined,
    `    <changefreq>${opts.changefreq}</changefreq>`,
    `    <priority>${opts.priority}</priority>`,
    links.length > 0 ? links : undefined,
    "  </url>",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

const entries = [
  ...STATIC_ENTRIES.map((e) =>
    urlEntry(e.path, { changefreq: e.changefreq, priority: e.priority }),
  ),
  ...originals
    .map((ev) => {
      const slug = tag(ev, "d");
      const publishedAt = tag(ev, "published_at");
      if (!slug || !publishedAt) return undefined;
      return urlEntry(`/news/${slug}`, {
        changefreq: "monthly",
        priority: "0.7",
        lastmod: new Date(Number(publishedAt) * 1000)
          .toISOString()
          .slice(0, 10),
        links: [
          ["en", slug],
          ...(alternates.get(slug) ?? []).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ],
      });
    })
    .filter((e) => e !== undefined),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...entries,
  "</urlset>",
  "",
].join("\n");

for (const dir of OUT_DIRS) {
  if (!existsSync(dir)) continue;
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "sitemap.xml");
  writeFileSync(out, xml);
  console.log(`wrote ${out}`);
}
console.log(
  `sitemap: ${STATIC_ENTRIES.length} static + ${entries.length - STATIC_ENTRIES.length} news URLs`,
);
