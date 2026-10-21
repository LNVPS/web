export const ConsentStorageKey = "ads-consent";

export type ConsentChoice = "granted" | "denied";

export interface AdsConfig {
  tagId: string;
  purchaseLabel: string;
}

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function adsConfig(env: Record<string, unknown>): AdsConfig | undefined {
  const tagId =
    typeof env.VITE_GOOGLE_ADS_ID === "string"
      ? env.VITE_GOOGLE_ADS_ID.trim()
      : "";
  if (!tagId) return undefined;
  const label = env.VITE_GOOGLE_ADS_PURCHASE_LABEL;
  return {
    tagId,
    purchaseLabel: typeof label === "string" ? label.trim() : "",
  };
}

export function consentState(choice: ConsentChoice) {
  return {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  };
}

export function storedConsent(
  storage: Pick<Storage, "getItem">,
): ConsentChoice | undefined {
  const value = storage.getItem(ConsentStorageKey);
  return value === "granted" || value === "denied" ? value : undefined;
}

export function pageLocation(pathname: string, search: string) {
  return `${pathname}${search}`;
}

export function loadAds(
  config: AdsConfig,
  win: Window,
  doc: Document,
  storage: Pick<Storage, "getItem">,
) {
  if (win.gtag) return;
  win.dataLayer = win.dataLayer ?? [];
  win.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer!.push(arguments);
  };
  win.gtag("consent", "default", consentState("denied"));
  if (storedConsent(storage) === "granted") {
    win.gtag("consent", "update", consentState("granted"));
  }
  win.gtag("js", new Date());
  win.gtag("config", config.tagId, { send_page_view: false });
  const script = doc.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.tagId)}`;
  doc.head.appendChild(script);
}

export function recordConsent(
  choice: ConsentChoice,
  win: Pick<Window, "gtag">,
  storage: Pick<Storage, "setItem">,
) {
  storage.setItem(ConsentStorageKey, choice);
  if (choice === "granted")
    win.gtag?.("consent", "update", consentState("granted"));
}

export function trackPageView(
  win: Pick<Window, "gtag">,
  location: string,
  title: string,
) {
  win.gtag?.("event", "page_view", {
    page_location: location,
    page_title: title,
  });
}

export function isFirstPayment(vm: { expires?: string } | undefined) {
  return vm !== undefined && !vm.expires;
}

export function trackPurchase(
  config: AdsConfig | undefined,
  win: Pick<Window, "gtag">,
) {
  if (!config?.purchaseLabel) return;
  win.gtag?.("event", "conversion", {
    send_to: `${config.tagId}/${config.purchaseLabel}`,
  });
}
