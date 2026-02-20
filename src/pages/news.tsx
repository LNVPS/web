import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useRequestBuilder } from "@snort/system-react";
import { NewsPostContent } from "./news-post";

export function NewsPage() {
  const req = new RequestBuilder("news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(10);

  const posts = useRequestBuilder(req);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-2xl">News</div>
      {posts
        .sort((a, b) => {
          const a_posted = Number(
            a.tags.find((a) => a[0] == "published_at")?.[1] ?? a.created_at,
          );
          const b_posted = Number(
            b.tags.find((z) => z[0] == "published_at")?.[1] ?? b.created_at,
          );
          return b_posted - a_posted;
        })
        .map((a) => (
          <article
            key={a.id}
            className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-6"
          >
            <NewsPostContent ev={a} />
          </article>
        ))}
      {posts.length === 0 && <div>No posts yet..</div>}
    </div>
  );
}
