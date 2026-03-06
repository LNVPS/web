import { FormattedMessage, useIntl } from "react-intl";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";
import Seo from "../components/seo";
import { Link } from "react-router-dom";
import {
  getNewsExcerpt,
  getNewsPublishedAt,
  getNewsSlug,
  getNewsTitle,
} from "../utils/news-seo";
import { useNewsPost } from "../hooks/news-post";

export function NewsPage() {
  const { locale } = useLocale();
  const { formatMessage } = useIntl();

  const rawPosts = useNewsPost();
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
        title={formatMessage({ defaultMessage: "News and Product Updates" })}
        canonical="/news"
        description={formatMessage({
          defaultMessage:
            "Latest news, updates, and announcements from LNVPS — your Bitcoin Lightning VPS provider.",
        })}
      />
      <h1 className="text-2xl">
        <FormattedMessage defaultMessage="LNVPS News and Product Updates" />
      </h1>
      {posts.map((a) => (
        <article
          key={a.id}
          className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-6"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <h2 className="text-xl text-cyber-text-bright">
                <Link to={`/news/${getNewsSlug(a)}`} state={a}>
                  {getNewsTitle(a)}
                </Link>
              </h2>
              <div className="text-sm text-cyber-muted">
                {new Date(getNewsPublishedAt(a) * 1000).toLocaleDateString()}
              </div>
            </div>
            <p className="text-cyber-muted">{getNewsExcerpt(a, 240)}</p>
            <div>
              <Link to={`/news/${getNewsSlug(a)}`} state={a}>
                <FormattedMessage defaultMessage="Read the full update" />
              </Link>
            </div>
          </div>
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
