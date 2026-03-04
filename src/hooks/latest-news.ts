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

  // Fetch enough events to cover all translation variants of the most recent
  // article plus a buffer. With 11 supported locales, one article can have up
  // to 11 variants — fetching 25 ensures the English original of the latest
  // article is always included even when translations are published after it.
  const req = new RequestBuilder("latest-news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(25);

  return useCached(
    `latest-news:v2:${locale}`,
    async () => {
      const events = await system.Fetch(req);
      return filterArticlesByLocale(events, locale).slice(0, 1);
    },
    CACHE_DURATION,
  );
}
