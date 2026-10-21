import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { AdsSettings, adsActive } from "../utils/ads-env";
import {
  loadAds,
  pageLocation,
  recordConsent,
  storedConsent,
  trackPageView,
  type ConsentChoice,
} from "../utils/ads";

export default function AdsConsent() {
  const location = useLocation();
  const [undecided, setUndecided] = useState(false);

  useEffect(() => {
    if (!AdsSettings || !adsActive()) return;
    loadAds(AdsSettings, window, document, window.localStorage);
    setUndecided(storedConsent(window.localStorage) === undefined);
  }, []);

  useEffect(() => {
    if (!adsActive()) return;
    trackPageView(
      window,
      window.location.origin + pageLocation(location.pathname, location.search),
      document.title,
    );
  }, [location.pathname, location.search]);

  if (!undecided) return null;

  function choose(choice: ConsentChoice) {
    recordConsent(choice, window, window.localStorage);
    setUndecided(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-3 rounded-sm border border-cyber-border bg-cyber-panel p-4 text-sm text-cyber-text shadow-neon-sm"
    >
      <p className="m-0">
        <FormattedMessage defaultMessage="We use cookies to measure which ads lead to orders. Nothing is set unless you accept." />
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => choose("granted")}
          className="rounded-sm border border-cyber-primary bg-cyber-primary/20 px-3 py-1.5 text-cyber-primary hover:bg-cyber-primary/30"
        >
          <FormattedMessage defaultMessage="Accept" />
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-sm border border-cyber-border px-3 py-1.5 hover:border-cyber-primary"
        >
          <FormattedMessage defaultMessage="Decline" />
        </button>
      </div>
    </div>
  );
}
