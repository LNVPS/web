import { EventKind, RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { NostrProfile } from "../const";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";
import { useLoaderData } from "react-router-dom";
import { NewsLoaderData } from "../loaders";

export function useNewsPost(dTag?: string) {
  const { locale } = useLocale();
  const { articles } = useLoaderData<NewsLoaderData>();

  const req = useMemo(() => {
    const req = new RequestBuilder("news-post");
    if (import.meta.env.SSR) {
      return req;
    }
    const f = req.withFilter()
      .kinds([EventKind.LongFormTextNote])
      .authors([NostrProfile.id])
      .limit(100);
    if (dTag) {
      f.tag("d", [dTag]);
    }
    return req;
  }, [dTag]);

  const events = useRequestBuilder(req);
  return filterArticlesByLocale(articles ?? events, locale);
}
