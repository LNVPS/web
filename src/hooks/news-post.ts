import { RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { NostrProfile } from "../const";

export function useNewsPost(dTag?: string) {
  const req = useMemo(() => {
    const req = new RequestBuilder("news-post");
    if (dTag) {
      req.withFilter().tag("d", [dTag]).authors([NostrProfile.id]).limit(1);
    }
    return req;
  }, [dTag]);

  return useRequestBuilder(req);
}
