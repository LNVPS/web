import { EventKind, RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useCached } from "./useCached";
import { useContext } from "react";
import { SnortContext } from "@snort/system-react";

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export function useLatestNews() {
  const system = useContext(SnortContext);
  const req = new RequestBuilder("latest-news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(1);

  return useCached(
    "latest-new",
    async () => {
      return await system.Fetch(req);
    },
    CACHE_DURATION,
  );
}
