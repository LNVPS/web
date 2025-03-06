import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useRequestBuilder } from "@snort/system-react";
import { NewLink } from "./news-link";

export function LatestNews() {
  const req = new RequestBuilder("latest-news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(1);

  const posts = useRequestBuilder(req);

  if (posts.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xl">Latest News</div>
        <NewLink ev={posts[0]} />
      </div>
    );
  }
}
