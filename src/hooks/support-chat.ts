import { useEffect, useState } from "react";
import { LNVpsApi, type SupportChatAvailability } from "../api";
import { ApiUrl } from "../const";

/**
 * One probe per page load, shared by every caller. The answer is a property of
 * the deployment, not of the user, so re-checking it on each mount would be a
 * request per navigation for a value that cannot change under us.
 */
let probe: Promise<SupportChatAvailability> | undefined;

/** Reset the memoised probe. Test-only. */
export function resetSupportChatProbe() {
  probe = undefined;
}

/**
 * Whether the API serves the live support chat, and to whom.
 *
 * `undefined` while the probe is in flight — render neither the entry point nor
 * an "unavailable" state until it resolves, so the UI doesn't flash.
 *
 * `anonymous` is the one a public page must check: chat can be configured with
 * logged-out sessions switched off, and offering it anyway renders a box that
 * always refuses.
 */
export default function useSupportChatAvailable() {
  const [available, setAvailable] = useState<SupportChatAvailability>();

  useEffect(() => {
    let cancelled = false;
    probe = probe ?? new LNVpsApi(ApiUrl, undefined).supportChatAvailable();
    probe.then((v) => {
      if (!cancelled) setAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
