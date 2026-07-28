import { describe, expect, test } from "bun:test";
import {
  buildSitemapXml,
  STATIC_ENTRIES,
  type ArchiveEvent,
} from "./gen-sitemap";

function article(d: string, lang?: string): ArchiveEvent {
  return {
    tags: [
      ["d", d],
      ["title", d],
      ["published_at", "1783360800"],
      ...(lang
        ? [
            ["L", "ISO-639-1"],
            ["l", lang, "ISO-639-1"],
          ]
        : []),
    ],
  };
}

describe("buildSitemapXml", () => {
  const xml = buildSitemapXml(
    [article("post"), article("post-de", "de")],
    [1, 6],
  );

  test("a translation is its own URL, not only an alternate", () => {
    expect(xml).toContain("<loc>https://lnvps.net/news/post</loc>");
    expect(xml).toContain("<loc>https://lnvps.net/news/post-de</loc>");
  });

  test("both variants carry the whole alternate set, so the return tags exist", () => {
    const urls = xml.split("<url>").filter((u) => u.includes("/news/"));
    expect(urls).toHaveLength(2);
    for (const url of urls) {
      expect(url).toContain(
        '<xhtml:link rel="alternate" hreflang="en" href="https://lnvps.net/news/post"/>',
      );
      expect(url).toContain(
        '<xhtml:link rel="alternate" hreflang="de" href="https://lnvps.net/news/post-de"/>',
      );
      expect(url).toContain(
        '<xhtml:link rel="alternate" hreflang="x-default" href="https://lnvps.net/news/post"/>',
      );
    }
  });

  test("app URLs come from the ids it was given", () => {
    expect(xml).toContain("<loc>https://lnvps.net/apps/6</loc>");
    expect(xml).not.toContain("<loc>https://lnvps.net/apps/2</loc>");
  });

  test("keeps every static route", () => {
    for (const entry of STATIC_ENTRIES) {
      expect(xml).toContain(`<loc>https://lnvps.net${entry.path}</loc>`);
    }
  });

  test("lastmod is the published_at date", () => {
    expect(xml).toContain("<lastmod>2026-07-06</lastmod>");
  });
});
