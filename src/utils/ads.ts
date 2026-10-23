import type { ExchangeRates } from "../api";
import { convertAmount, smallestUnitScale } from "./currency";

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

/** What Google Ads is told a purchase was worth: standard units of a fiat currency. */
export interface PurchaseValue {
  value: number;
  currency: string;
}

/**
 * The amount a customer was really charged for a payment — list price net of
 * any discount, plus VAT and processing fee — as a Google Ads conversion
 * value. Amounts are integers in the smallest unit; BTC (millisats) is
 * converted to EUR at the current rate since Ads only takes fiat. Returns
 * undefined when it can't be priced (no rates for a BTC payment), so the
 * conversion is still counted rather than reported with a wrong value.
 */
export function purchaseValue(
  payment: {
    amount: number;
    tax: number;
    processing_fee: number;
    currency: string;
  },
  rates: ExchangeRates | undefined,
): PurchaseValue | undefined {
  const total = payment.amount + payment.tax + payment.processing_fee;
  let currency = payment.currency;
  let smallest = total;
  if (currency === "BTC") {
    if (!rates) return undefined;
    const eur = convertAmount(total, "BTC", "EUR", rates);
    if (eur === undefined) return undefined;
    currency = "EUR";
    smallest = eur;
  }
  const value = Math.round(smallest) / smallestUnitScale(currency);
  return { value, currency };
}

export function trackPurchase(
  config: AdsConfig | undefined,
  win: Pick<Window, "gtag">,
  transactionId?: string | number,
  amount?: PurchaseValue,
) {
  if (!config?.purchaseLabel) return;
  win.gtag?.("event", "conversion", {
    send_to: `${config.tagId}/${config.purchaseLabel}`,
    ...(amount ? { value: amount.value, currency: amount.currency } : {}),
    transaction_id: transactionId === undefined ? "" : String(transactionId),
  });
}
