import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useRequestBuilder } from "@snort/system-react";
import { Link } from "react-router-dom";

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
        .map((a) => {
          const link = NostrLink.fromEvent(a);
          const title = a.tags.find((a) => a[0] == "title")?.[1];
          const posted = Number(
            a.tags.find((a) => a[0] == "published_at")?.[1] ?? a.created_at,
          );
          const slug = title
            ?.toLocaleLowerCase()
            .replace(/[:/]/g, "")
            .trimStart()
            .trimEnd()
            .replace(/ /g, "-");
          return (
            <Link to={`/news/${slug}`} state={a} key={link.tagKey}>
              <div className="flex flex-col rounded-xl bg-neutral-900 px-3 py-4">
                <div className="text-xl flex items-center justify-between">
                  <div>{title}</div>
                  <div>{new Date(posted * 1000).toDateString()}</div>
                </div>
              </div>
            </Link>
          );
        })}
      {posts.length === 0 && <div>No posts yet..</div>}
    </div>
  );
}
