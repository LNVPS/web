import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useLocation, useParams } from "react-router-dom";
import Markdown from "../components/markdown";
import Profile from "../components/profile";
import { useNewsPost } from "../hooks/news-post";
import { FormattedDate } from "react-intl";
import Seo from "../components/seo";
import {
  getNewsExcerpt,
  getNewsPublishedAt,
  getNewsSlug,
  getNewsTitle,
} from "../utils/news-seo";

export function NewsPostContent({ ev }: { ev: NostrEvent }) {
  const title = getNewsTitle(ev);
  const posted = getNewsPublishedAt(ev);
  const postedIso = new Date(posted * 1000).toISOString();
  const excerpt = getNewsExcerpt(ev);
  const canonical = `/news/${getNewsSlug(ev)}`;

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: excerpt,
    datePublished: postedIso,
    publisher: {
      "@type": "Organization",
      name: "LNVPS",
      logo: {
        "@type": "ImageObject",
        url: "https://lnvps.net/logo.jpg",
      },
    },
  };

  return (
    <div>
      {title && (
        <Seo
          title={title}
          description={excerpt}
          ogType="article"
          canonical={canonical}
          publishedAt={postedIso}
          jsonLd={newsArticleSchema}
        />
      )}
      <h1 className="text-2xl">{title}</h1>
      <div className="flex items-center justify-between py-8">
        <Profile link={NostrLink.profile(ev.pubkey)} />
        <div>
          <FormattedDate
            value={posted * 1000}
            year="numeric"
            month="long"
            day="numeric"
            hour="numeric"
            minute="numeric"
          />
        </div>
      </div>

      <Markdown content={ev.content} />
    </div>
  );
}

export function NewsPost() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state?: TaggedNostrEvent };

  const data = useNewsPost(state ? undefined : id);
  const ev = state || data.at(0);

  if (!ev) return null;
  return <NewsPostContent ev={ev} />;
}
