import type { IntlShape } from "react-intl";
import { ExchangeRates } from "../api";

/**
 * Smallest-unit scale per currency: app amounts are integers in the smallest
 * unit — fiat in cents (÷100 for the standard value) and BTC in millisats
 * (1 BTC = 100,000,000 sats = 100,000,000,000 msats).
 */
export function smallestUnitScale(currency: string): number {
  return currency === "BTC" ? 100_000_000_000 : 100;
}

/**
 * The figure `CostAmount` renders, as a plain string.
 *
 * `CostAmount` (`src/components/cost.tsx:96`) is the only thing that should
 * paint a price, and everything that renders JSX keeps using it. This exists
 * for the two slots that cannot take an element — `Seo`'s `title` and
 * `description`, which are `formatMessage` strings — so a page can put its
 * price in a `{price}` placeholder there instead of writing the number into
 * the translatable copy.
 *
 * Deliberately not the same thing as `CostLabel`: no currency conversion and
 * no VAT gross-up. A `<title>` is rendered once on the server for whoever asks
 * for the URL, so it has no display currency and no account to read a tax
 * setting from, and the `Offer` markup alongside it asserts
 * `valueAddedTaxIncluded: false`.
 */
export function formatPriceText(
  intl: IntlShape,
  cost: { currency: string; amount: number },
): string {
  if (cost.currency === "BTC") {
    // Mirrors `CostAmount`: millisats floored to sats, no currency style.
    return `${intl.formatNumber(Math.floor(cost.amount / 1000))} sats`;
  }
  return intl.formatNumber(cost.amount / smallestUnitScale(cost.currency), {
    style: "currency",
    currency: cost.currency,
    trailingZeroDisplay: "stripIfInteger",
  });
}

/** A currency's rate relative to the snapshot base (the base itself is 1). */
function rateOf(currency: string, rates: ExchangeRates): number | undefined {
  if (currency === rates.base) return 1;
  return rates.rates[currency];
}

/**
 * Convert a smallest-unit amount between currencies using an exchange-rate
 * snapshot. Returns undefined when either currency isn't in the snapshot, so
 * callers can fall back (e.g. defer gating to the server).
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates,
): number | undefined {
  if (from === to) return amount;
  const rFrom = rateOf(from, rates);
  const rTo = rateOf(to, rates);
  if (!rFrom || !rTo) return undefined;
  // amount(from, smallest) → standard → base → to(standard) → to(smallest).
  const standardFrom = amount / smallestUnitScale(from);
  const standardTo = standardFrom * (rTo / rFrom);
  return standardTo * smallestUnitScale(to);
}
