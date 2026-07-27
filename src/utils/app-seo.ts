import { CostPlanIntervalType, type App } from "../api";
import { smallestUnitScale } from "./currency";

/** Matches `SITE_URL` in `src/components/seo.tsx:5`, for absolute schema URLs. */
const SITE_URL = "https://lnvps.net";

/**
 * Billing period unit per interval the API can return (`src/api.ts:29-33`).
 *
 * `code` is the UN/CEFACT Common Code for `unitCode`, which is the property
 * schema.org names for this job: `billingDuration` is "a Duration or a Number
 * (in which case the unit of measurement … is specified by the `unitCode`
 * property)", and `billingIncrement`'s "unit of measurement is specified by the
 * `unitCode` property". We emit Numbers, so the code is the carrier and
 * `unitText` is the documented fallback for when a code is unavailable — kept
 * alongside because it costs nothing and is what a human reading the markup
 * sees.
 *
 * Codes from UN/CEFACT Rec 20 Annex I, quantity "time": `DAY` day, `MON`
 * month, `ANN` year.
 *
 * Typed on the enum, so a new interval type is a type error here rather than
 * an undefined in the markup.
 */
const BILLING_UNIT: Record<CostPlanIntervalType, { code: string; text: string }> =
  {
    [CostPlanIntervalType.DAY]: { code: "DAY", text: "DAY" },
    [CostPlanIntervalType.MONTH]: { code: "MON", text: "MONTH" },
    [CostPlanIntervalType.YEAR]: { code: "ANN", text: "YEAR" },
  };

/**
 * The recurring price in standard units as a plain decimal, for structured
 * data. Undefined for BTC: amounts there are millisats, which two decimal
 * places cannot express — better no `price` than "0.00".
 */
function standardUnitPrice(app: App): string | undefined {
  if (app.currency === "BTC") return undefined;
  return (app.amount / smallestUnitScale(app.currency)).toFixed(2);
}

/**
 * `Product`/`Offer` structured data for one app. Shape per `LNVPS/web#32`.
 *
 * Built from the app's own price and identity, which every app has, so a new
 * catalog app gets a rich result with no code change here. The description is
 * the API's, the same string the page renders under the h1, so the rich result
 * and the meta tag cannot say different things.
 */
export function appJsonLd(app: App): object {
  const url = `${SITE_URL}/apps/${app.id}`;
  const offerPrice = standardUnitPrice(app);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: app.display_name,
    ...(app.description ? { description: app.description } : {}),
    url,
    brand: { "@type": "Brand", name: "LNVPS" },
    ...(offerPrice
      ? {
          offers: {
            "@type": "Offer",
            url,
            availability: "https://schema.org/InStock",
            price: offerPrice,
            priceCurrency: app.currency,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: offerPrice,
              priceCurrency: app.currency,
              // Ex-VAT, matching what the page shows logged out. Never
              // conditional on the VAT toggle: this is what a crawler sees.
              valueAddedTaxIncluded: false,
              // The billing period is derived, not guessed: `interval_type`
              // and `interval_amount` say exactly what it is. Omitting it for
              // a yearly app would advertise a bare recurring figure with no
              // period, which reads as a total.
              billingDuration: app.interval_amount,
              billingIncrement: 1,
              unitCode: BILLING_UNIT[app.interval_type].code,
              unitText: BILLING_UNIT[app.interval_type].text,
            },
          },
        }
      : {}),
  };
}
