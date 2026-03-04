import { NostrEvent, NostrLink } from "@snort/system";
import { Link } from "react-router-dom";
import { FormattedDate } from "react-intl";

export function NewsLink({ ev }: { ev: NostrEvent }) {
  const link = NostrLink.fromEvent(ev);
  const title = ev.tags.find((a) => a[0] == "title")?.[1];
  const posted = Number(
    ev.tags.find((a) => a[0] == "published_at")?.[1] ?? ev.created_at,
  );
  const dtag = ev.tags.find((a) => a[0] == "d")?.[1] ?? ev.id;
  return (
    <Link to={`/news/${dtag}`} state={ev} key={link.tagKey}>
      <div className="flex flex-col rounded-sm border border-cyber-border bg-cyber-panel px-3 py-4 hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200">
        <div className="text-xl flex items-center justify-between">
          <div className="text-cyber-text-bright">{title}</div>
          <div className="text-cyber-muted text-sm">
            <FormattedDate
              value={posted * 1000}
              year="numeric"
              month="short"
              day="numeric"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
