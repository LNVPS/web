import { NostrEvent, NostrLink } from "@snort/system";
import { Link } from "react-router-dom";

export function NewsLink({ ev }: { ev: NostrEvent }) {
  const link = NostrLink.fromEvent(ev);
  const title = ev.tags.find((a) => a[0] == "title")?.[1];
  const posted = Number(
    ev.tags.find((a) => a[0] == "published_at")?.[1] ?? ev.created_at,
  );
  const slug = title
    ?.toLocaleLowerCase()
    .replace(/[:/]/g, "")
    .trimStart()
    .trimEnd()
    .replace(/ /g, "-");
  return (
    <Link to={`/news/${slug}`} state={ev} key={link.tagKey}>
      <div className="flex flex-col rounded-sm border border-cyber-border bg-cyber-panel px-3 py-4 hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200">
        <div className="text-xl flex items-center justify-between">
          <div className="text-cyber-text-bright">{title}</div>
          <div className="text-cyber-muted text-sm">
            {new Date(posted * 1000).toDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
