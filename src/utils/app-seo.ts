import type { IntlShape } from "react-intl";
import { CostPlanIntervalType, type App } from "../api";
import { GiB } from "../const";
import { formatBytesText } from "./bytes";
import { formatPriceText, smallestUnitScale } from "./currency";

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
 * The page `<title>`, without the `" | LNVPS"` that `Seo` appends.
 *
 * Templated from `display_name` + `category` rather than written per app: the
 * catalog is a database table, so copy for a sixth app has to arrive as a row,
 * not as a frontend deploy.
 *
 * `category` and `seo_title` are both wire data, so neither is extracted for
 * translation: only the sentence around them is localised, and the class of
 * software stays English until the API serves it per locale (LNVPS/api#285).
 */
export function appSeoTitle(app: App, intl: IntlShape): string {
  if (app.seo_title) return app.seo_title;
  if (!app.category) return app.display_name;
  return intl.formatMessage(
    { defaultMessage: "{name} Hosting — Managed {category}" },
    { name: app.display_name, category: app.category },
  );
}

/**
 * The meta description, templated from the app's structured fields.
 *
 * Deliberately does **not** interpolate `app.description`: that is admin free
 * text with no length or grammatical contract, so dropping it into a sentence
 * produces a broken one about half the time. Every branch here ends on a
 * complete sentence instead.
 */
export function appSeoDescription(
  app: App,
  intl: IntlShape,
): string | undefined {
  if (app.seo_description) return app.seo_description;
  if (!app.category) return app.description;

  const lede =
    app.storage_bytes >= GiB
      ? intl.formatMessage(
          {
            defaultMessage:
              "Run {name} as a managed {category} on LNVPS — own hostname, TLS included, {storage} storage, no server to patch.",
          },
          {
            name: app.display_name,
            category: app.category,
            storage: formatBytesText(intl, app.storage_bytes),
          },
        )
      : intl.formatMessage(
          {
            defaultMessage:
              "Run {name} as a managed {category} on LNVPS — own hostname, TLS included, no server to patch.",
          },
          { name: app.display_name, category: app.category },
        );

  // A figure is only quotable when it is a monthly price in a currency that
  // renders as one. BTC amounts are millisats and a yearly plan's amount is
  // not a monthly one — either way, quote the payment options instead.
  const monthly =
    app.interval_amount === 1 &&
    app.interval_type === CostPlanIntervalType.MONTH;
  const priceClause =
    monthly && standardUnitPrice(app) !== undefined
      ? intl.formatMessage(
          { defaultMessage: "{price}/month, pay with Lightning." },
          { price: formatPriceText(intl, app) },
        )
      : intl.formatMessage({
          defaultMessage: "Pay with Lightning, Bitcoin, or card.",
        });

  return `${lede} ${priceClause}`;
}

/**
 * `Product`/`Offer` structured data for one app. Shape per `LNVPS/web#32`.
 *
 * Built from the app's own price and identity, which every app has, so a new
 * catalog app gets a rich result with no code change here. The description is
 * the same string as the meta tag, via `appSeoDescription`, so the rich result
 * and the meta tag cannot say different things.
 */
export function appJsonLd(app: App, intl: IntlShape): object {
  const url = `${SITE_URL}/apps/${app.id}`;
  const offerPrice = standardUnitPrice(app);
  const description = appSeoDescription(app, intl);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: app.display_name,
    ...(description ? { description } : {}),
    ...(app.category ? { category: app.category } : {}),
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
