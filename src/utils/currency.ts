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

/**
 * The word for a billing interval ("month", "months", ...) — the one place
 * that maps an interval to text, so `IntervalSuffix` and a plain-text price
 * sentence read the same translation instead of two that could drift apart.
 */
export function formatIntervalText(
  intl: IntlShape,
  interval: string,
  n = 1,
): string {
  switch (interval) {
    case "day":
      return intl.formatMessage(
        { defaultMessage: "{n, plural, one {day} other {days}}" },
        { n },
      );
    case "month":
      return intl.formatMessage(
        { defaultMessage: "{n, plural, one {month} other {months}}" },
        { n },
      );
    case "year":
      return intl.formatMessage(
        { defaultMessage: "{n, plural, one {year} other {years}}" },
        { n },
      );
    default:
      return interval;
  }
}

/**
 * `formatPriceText` with "/<interval>" appended, for a recurring price —
 * the custom-VM entry price on the region pages, not a one-off figure.
 */
export function formatPriceWithInterval(
  intl: IntlShape,
  cost: { currency: string; amount: number; interval_type: string },
): string {
  return `${formatPriceText(intl, cost)}/${formatIntervalText(intl, cost.interval_type)}`;
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
