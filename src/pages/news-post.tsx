import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { useLocation } from "react-router-dom";
import Markdown from "../components/markdown";
import Profile from "../components/profile";

export function NewsPost() {
  const { state } = useLocation() as { state?: TaggedNostrEvent };

  if (!state) return;
  const title = state.tags.find((a) => a[0] == "title")?.[1];
  const posted = Number(
    state.tags.find((a) => a[0] == "published_at")?.[1] ?? state.created_at,
  );
  return (
    <div>
      <div className="text-2xl">{title}</div>
      <div className="flex items-center justify-between py-8">
        <Profile link={NostrLink.profile(state.pubkey, state.relays)} />
        <div>{new Date(posted * 1000).toLocaleString()}</div>
      </div>

      <Markdown content={state.content} />
    </div>
  );
}
