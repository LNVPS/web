import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useCached } from "./useCached";
import { useContext } from "react";
import { SnortContext } from "@snort/system-react";
import { useLocale } from "../components/translation-provider";
import { filterArticlesByLocale } from "../utils/news-locale";

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export function useLatestNews() {
  const system = useContext(SnortContext);
  const { locale } = useLocale();

  // Fetch more than 1 so we can pick the best locale version after filtering.
  // Translations share the same d-tag, so e.g. limit:10 gives ~5 unique articles
  // across up to 2 language variants each.
  const req = new RequestBuilder("latest-news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(10);

  return useCached(
    `latest-news:${locale}`,
    async () => {
      const events = await system.Fetch(req);
      return filterArticlesByLocale(events, locale).slice(0, 1);
    },
    CACHE_DURATION,
  );
}
