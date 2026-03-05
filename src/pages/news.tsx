import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useRequestBuilder } from "@snort/system-react";
import { NewsPostContent } from "./news-post";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";
import Seo from "../components/seo";
import { useLoaderData } from "react-router-dom";
import type { NewsLoaderData } from "../loaders";

export function NewsPage() {
  const { locale } = useLocale();
  const { formatMessage } = useIntl();
  const { articles: loaderArticles } = useLoaderData<NewsLoaderData>();

  const req = new RequestBuilder("news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(50);

  const liveEvents = useRequestBuilder(req);

  // Prefer live relay data, fall back to loader (SSR) data
  const rawPosts = liveEvents.length > 0 ? liveEvents : loaderArticles;
  const posts = filterArticlesByLocale(rawPosts, locale).sort((a, b) => {
    const a_posted = Number(
      a.tags.find((t) => t[0] == "published_at")?.[1] ?? a.created_at,
    );
    const b_posted = Number(
      b.tags.find((t) => t[0] == "published_at")?.[1] ?? b.created_at,
    );
    return b_posted - a_posted;
  });

  return (
    <div className="flex flex-col gap-6">
      <Seo
        title={formatMessage({ defaultMessage: "News" })}
        canonical="/news"
        description={formatMessage({
          defaultMessage:
            "Latest news, updates, and announcements from LNVPS — your Bitcoin Lightning VPS provider.",
        })}
      />
      <div className="text-2xl">
        <FormattedMessage defaultMessage="News" />
      </div>
      {posts.map((a) => (
        <article
          key={a.id}
          className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-6"
        >
          <NewsPostContent ev={a} />
        </article>
      ))}
      {posts.length === 0 && (
        <div>
          <FormattedMessage defaultMessage="No posts yet.." />
        </div>
      )}
    </div>
  );
}
