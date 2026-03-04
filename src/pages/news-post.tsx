import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useLocation, useParams } from "react-router-dom";
import Markdown from "../components/markdown";
import Profile from "../components/profile";
import { useNewsPost } from "../hooks/news-post";
import { FormattedDate } from "react-intl";

export function NewsPostContent({ ev }: { ev: NostrEvent }) {
  const title = ev.tags.find((a) => a[0] == "title")?.[1];
  const posted = Number(
    ev.tags.find((a) => a[0] == "published_at")?.[1] ?? ev.created_at,
  );
  return (
    <div>
      <div className="text-2xl">{title}</div>
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
