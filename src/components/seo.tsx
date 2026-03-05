import { useMemo } from "react";
import { useHead, type HeadTags } from "./head-context";

const SITE_NAME = "LNVPS";
const SITE_URL = "https://lnvps.net";
const DEFAULT_DESCRIPTION = "Bitcoin Lightning VPS provider";
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.jpg`;

interface SeoProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  canonical?: string;
  noindex?: boolean;
  /** JSON-LD structured data objects */
  jsonLd?: object | object[];
  /** Published date (ISO string) for articles */
  publishedAt?: string;
  /** Author name for articles */
  author?: string;
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  canonical,
  noindex = false,
  jsonLd,
  publishedAt,
  author,
}: SeoProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const absoluteOgImage = ogImage.startsWith("http")
    ? ogImage
    : `${SITE_URL}${ogImage}`;

  const tags = useMemo<HeadTags>(() => {
    const meta: Array<Record<string, string>> = [
      { name: "description", content: description },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: ogType },
      { property: "og:image", content: absoluteOgImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: absoluteOgImage },
    ];
    if (noindex) meta.push({ name: "robots", content: "noindex,nofollow" });
    if (canonicalUrl) meta.push({ property: "og:url", content: canonicalUrl });
    if (publishedAt)
      meta.push({ property: "article:published_time", content: publishedAt });
    if (author) meta.push({ property: "article:author", content: author });

    const links: Array<Record<string, string>> = [];
    if (canonicalUrl) links.push({ rel: "canonical", href: canonicalUrl });

    const jsonLdArray = jsonLd
      ? Array.isArray(jsonLd)
        ? jsonLd
        : [jsonLd]
      : [];
    const scripts = jsonLdArray.map((s) => JSON.stringify(s));

    return { title: pageTitle, meta, links, scripts };
  }, [
    pageTitle,
    description,
    ogType,
    absoluteOgImage,
    canonicalUrl,
    noindex,
    publishedAt,
    author,
    jsonLd,
  ]);

  useHead(tags);

  // Render nothing — tags are managed via context (SSR) or DOM (client).
  return null;
}
