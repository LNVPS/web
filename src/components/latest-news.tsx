import { Link } from "react-router-dom";
import { useLatestNews } from "../hooks/latest-news";
import { FormattedDate, FormattedMessage } from "react-intl";

export function LatestNews() {
  const { data: posts } = useLatestNews();

  if (!posts || posts.length === 0) return;

  const ev = posts[0];
  const title = ev.tags.find((a) => a[0] == "title")?.[1];
  const posted = Number(
    ev.tags.find((a) => a[0] == "published_at")?.[1] ?? ev.created_at,
  );
  const dtag = ev.tags.find((a) => a[0] == "d")?.[1] ?? ev.id;

  return (
    <Link
      to={`/news/${dtag}`}
      state={ev}
      className="flex items-center gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-3 py-2 hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200"
    >
      <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.25em] text-cyber-primary">
        <FormattedMessage defaultMessage="News" />
      </span>
      <span className="min-w-0 truncate text-sm text-cyber-text-bright">
        {title}
      </span>
      <span className="ml-auto shrink-0 text-xs text-cyber-muted">
        <FormattedDate
          value={posted * 1000}
          year="numeric"
          month="short"
          day="numeric"
        />
      </span>
    </Link>
  );
}
