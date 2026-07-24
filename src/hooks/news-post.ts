import { EventKind, RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { NostrProfile } from "../const";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";
import { useLoaderData } from "react-router-dom";
import { NewsLoaderData, NewsPostLoaderData } from "../loaders";

export function useNewsPost(dTag?: string) {
  const { locale } = useLocale();
  // This hook serves two routes with different loader shapes: /news provides
  // { articles }, /news/:id provides { article }. Read whichever is present —
  // without the single-article branch, SSR of a news post rendered nothing
  // (the loader fetched the article but nobody consumed it).
  const loaderData = useLoaderData<NewsLoaderData | NewsPostLoaderData>();
  const article = "article" in loaderData ? loaderData.article : undefined;
  const articles =
    "articles" in loaderData
      ? loaderData.articles
      : article
        ? [article]
        : undefined;

  const req = useMemo(() => {
    const req = new RequestBuilder("news-post");
    if (import.meta.env.SSR) {
      return req;
    }
    const f = req
      .withFilter()
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
