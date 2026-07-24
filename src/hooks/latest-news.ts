import { EventKind, RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { useLoaderData } from "react-router-dom";
import { NostrProfile } from "../const";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";
import type { HomeLoaderData } from "../loaders";

export function useLatestNews() {
  const { latestNews } = useLoaderData<HomeLoaderData>();
  const { locale } = useLocale();

  // The persistent "server-news" query only lives in the SSR process, so the
  // loader returns nothing on client-side navigation — subscribe directly as
  // a fallback (same pattern as useStatus / useNewsPost).
  const req = useMemo(() => {
    const req = new RequestBuilder("latest-news");
    if (import.meta.env.SSR) {
      return req;
    }
    req
      .withFilter()
      .kinds([EventKind.LongFormTextNote])
      .authors([NostrProfile.id])
      .limit(10);
    return req;
  }, []);

  const events = useRequestBuilder(req);
  const fallback = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.created_at - a.created_at);
    return filterArticlesByLocale(sorted, locale).slice(0, 1);
  }, [events, locale]);

  return { data: latestNews ?? fallback };
}
