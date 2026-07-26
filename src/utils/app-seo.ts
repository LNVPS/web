import { defineMessages, type IntlShape } from "react-intl";
import { CostPlanIntervalType, type App } from "../api";
import { smallestUnitScale } from "./currency";

/** Matches `SITE_URL` in `src/components/seo.tsx:5`, for absolute schema URLs. */
const SITE_URL = "https://lnvps.net";

/**
 * Search-facing title and description for a catalog app.
 *
 * `/apps/:id` took both from the API, which gives card blurbs — "Strfry",
 * "High performance nostr relay". Accurate on a card, and useless as the thing
 * a search result shows: no "hosting", no "managed", no price. This overrides
 * them on the public product page only; the API `description` keeps its job as
 * the card blurb and as the paragraph under the h1.
 *
 * Keyed on `app.name`, the API's URL/DNS-safe slug (`src/api.ts:622`) — ids
 * renumber, slugs do not. An app with no entry keeps today's behaviour, so a
 * sixth app in the catalog ships with a working page and no code change here.
 *
 * Copy: `OUTBOX/LNVPS_APP_PAGE_SEO_STRINGS.md`.
 */
const m = defineMessages({
  strfryTitle: { defaultMessage: "Strfry Hosting — Managed Nostr Relay" },
  strfryDescription: {
    defaultMessage:
      "Run a strfry relay on LNVPS with no server to manage — up in minutes on its own hostname, TLS and 10 GB storage included.",
  },
  route96Title: {
    defaultMessage: "Route96 — Managed Blossom Media Server Hosting",
  },
  route96Description: {
    defaultMessage:
      "Host your own Blossom and NIP-96 media server. Route96 on LNVPS comes up on its own hostname with TLS and 25 GB storage.",
  },
  nostrRsRelayTitle: {
    defaultMessage: "nostr-rs-relay Hosting — Managed Nostr Relay",
  },
  nostrRsRelayDescription: {
    defaultMessage:
      "Run nostr-rs-relay on LNVPS — a light Rust and SQLite relay, up in minutes on its own hostname with TLS and 10 GB storage.",
  },
  pyramidTitle: {
    defaultMessage: "Pyramid Hosting — Managed Community Nostr Relay",
  },
  pyramidDescription: {
    defaultMessage:
      "Host a Pyramid community relay on LNVPS — members invite members, and you run no server. Own hostname, TLS and 20 GB storage.",
  },
  havenTitle: { defaultMessage: "HAVEN Hosting — Managed Personal Nostr Relay" },
  havenDescription: {
    defaultMessage:
      "HAVEN on LNVPS is a personal relay with private, chat, inbox and outbox sections plus its own Blossom media server. 30 GB storage, TLS included.",
  },
  // The price tail is per app, not one shared string: four apps close on the
  // payment method, HAVEN closes on the price because its description is
  // already at the character limit.
  priceWithLightning: { defaultMessage: "{price}/month, pay with Lightning." },
  priceOnly: { defaultMessage: "{price}/month." },
});

type Message = (typeof m)[keyof typeof m];

interface AppSeoEntry {
  title: Message;
  /** Ends on a complete sentence; the price clause is appended, not embedded. */
  description: Message;
  /** Template for the price clause, taking a formatted `price`. */
  priceSuffix: Message;
}

const APP_SEO: Record<string, AppSeoEntry> = {
  strfry: {
    title: m.strfryTitle,
    description: m.strfryDescription,
    priceSuffix: m.priceWithLightning,
  },
  route96: {
    title: m.route96Title,
    description: m.route96Description,
    priceSuffix: m.priceWithLightning,
  },
  "nostr-rs-relay": {
    title: m.nostrRsRelayTitle,
    description: m.nostrRsRelayDescription,
    priceSuffix: m.priceWithLightning,
  },
  "pyramid-relay": {
    title: m.pyramidTitle,
    description: m.pyramidDescription,
    priceSuffix: m.priceWithLightning,
  },
  "haven-relay": {
    title: m.havenTitle,
    description: m.havenDescription,
    priceSuffix: m.priceOnly,
  },
};

/**
 * Billing period unit for `UnitPriceSpecification.unitText`, one per interval
 * the API can return (`src/api.ts:29-33`). Typed on the enum, so a new interval
 * type there is a type error here rather than an undefined in the markup.
 */
const BILLING_UNIT_TEXT: Record<CostPlanIntervalType, string> = {
  [CostPlanIntervalType.DAY]: "DAY",
  [CostPlanIntervalType.MONTH]: "MONTH",
  [CostPlanIntervalType.YEAR]: "YEAR",
};

/**
 * Whether the app bills at exactly one month, so "/month" means what it says.
 * Only the written price clause needs this — the structured data derives its
 * period from the interval instead of dropping it.
 */
function isMonthly(app: App): boolean {
  return (
    app.interval_type === CostPlanIntervalType.MONTH && app.interval_amount === 1
  );
}

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
 * The recurring price as a display string.
 *
 * A `<meta>` content attribute is a string, so `CostAmount` — a component —
 * cannot render it; this formats the same way it does (`src/components/cost.tsx:127-133`)
 * so the tag and the cards print the same figure.
 *
 * **Ex-VAT deliberately, no gross-up.** A meta tag is what a crawler and a link
 * preview see and both are logged out, so a logged-in reader's VAT toggle must
 * not change what the page advertises. This is the opposite of the `/apps`
 * lead, which sits beside cards that move with the toggle.
 */
function monthlyPrice(app: App, intl: IntlShape): string | undefined {
  if (!isMonthly(app)) return undefined;
  // Same reason as standardUnitPrice: `style: "currency"` rounds a millisat
  // figure to "BTC 0.00", so drop the clause rather than print a false price.
  if (app.currency === "BTC") return undefined;
  return intl.formatNumber(app.amount / smallestUnitScale(app.currency), {
    style: "currency",
    currency: app.currency,
    trailingZeroDisplay: "stripIfInteger",
  });
}

export interface AppSeo {
  /** Undefined when the app has no map entry; callers fall back to the API. */
  title?: string;
  description?: string;
  /** Always present: structured data does not depend on a map entry. */
  jsonLd: object;
}

/**
 * Title, meta description and `Product`/`Offer` structured data for one app.
 *
 * The title and description are undefined for an app with no map entry, so the
 * caller keeps the API strings. The structured data is not — it is built from
 * the app's own price and identity, which every app has, so a sixth app gets a
 * `Product`/`Offer` without a copy entry. Shape per `LNVPS/web#32`.
 */
export function appSeo(app: App, intl: IntlShape): AppSeo {
  const entry = APP_SEO[app.name];

  const price = entry ? monthlyPrice(app, intl) : undefined;
  const title = entry ? intl.formatMessage(entry.title) : undefined;
  const description = entry
    ? (() => {
        const base = intl.formatMessage(entry.description);
        return price
          ? `${base} ${intl.formatMessage(entry.priceSuffix, { price })}`
          : base;
      })()
    : undefined;

  const url = `${SITE_URL}/apps/${app.id}`;
  const offerPrice = standardUnitPrice(app);
  // The written description when we have one, so the rich result and the meta
  // tag on the same page cannot say different things.
  const schemaDescription = description ?? app.description;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    // The product is the app, not the search-facing title: "Strfry", not
    // "Strfry Hosting — Managed Nostr Relay".
    name: app.display_name,
    ...(schemaDescription ? { description: schemaDescription } : {}),
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
              // period, which reads as a total — the one drop that would be
              // false rather than merely weaker.
              billingDuration: app.interval_amount,
              billingIncrement: 1,
              unitText: BILLING_UNIT_TEXT[app.interval_type],
            },
          },
        }
      : {}),
  };

  return { title, description, jsonLd };
}
