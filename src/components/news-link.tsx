import { NostrEvent, NostrLink } from "@snort/system";
import { Link } from "react-router-dom";

export function NewLink({ ev }: { ev: NostrEvent }) {
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
      <div className="flex flex-col rounded-xl bg-neutral-900 px-3 py-4">
        <div className="text-xl flex items-center justify-between">
          <div>{title}</div>
          <div>{new Date(posted * 1000).toDateString()}</div>
        </div>
      </div>
    </Link>
  );
}
