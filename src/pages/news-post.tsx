import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useLocation } from "react-router-dom";
import Markdown from "../components/markdown";
import Profile from "../components/profile";

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
        <div>{new Date(posted * 1000).toLocaleString()}</div>
      </div>

      <Markdown content={ev.content} />
    </div>
  );
}

export function NewsPost() {
  const { state } = useLocation() as { state?: TaggedNostrEvent };

  if (!state) return;
  return <NewsPostContent ev={state} />;
}
