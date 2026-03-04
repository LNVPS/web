import { RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { NostrProfile } from "../const";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";

export function useNewsPost(dTag?: string) {
  const { locale } = useLocale();

  const req = useMemo(() => {
    const req = new RequestBuilder("news-post");
    if (dTag) {
      req.withFilter().tag("d", [dTag]).authors([NostrProfile.id]).limit(10);
    }
    return req;
  }, [dTag]);

  const events = useRequestBuilder(req);
  // All returned events share the same d-tag; pick the best locale version.
  return filterArticlesByLocale(events, locale);
}
