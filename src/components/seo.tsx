import { Helmet } from "react-helmet-async";

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

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={absoluteOgImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />

      {/* JSON-LD structured data */}
      {jsonLdArray.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
