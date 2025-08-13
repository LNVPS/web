import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useRequestBuilder } from "@snort/system-react";
import { NewsLink } from "../components/news-link";

export function NewsPage() {
  const req = new RequestBuilder("news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(10);

  const posts = useRequestBuilder(req);

  return (
    <div className="flex flex-col gap-4">
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
          <NewsLink ev={a} />
        ))}
      {posts.length === 0 && <div>No posts yet..</div>}
    </div>
  );
}
