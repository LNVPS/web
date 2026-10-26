import type { FormatNumberOptions, IntlShape } from "react-intl";
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
 * The number and `Intl.NumberFormat` options for a price, shared by every
 * place that paints one so they agree.
 *
 * Ordinary prices keep their usual look (whole sats, two decimals), but a
 * price that is a fraction of that unit — an hourly rate is a few sats or well
 * under a cent — keeps its precision instead of rounding to 0, 1 or a flat
 * cent, which would misquote it by a large factor.
 */
export function priceNumber(
  currency: string,
  amount: number,
): { value: number; options: FormatNumberOptions } {
  if (currency === "BTC") {
    // Millisats. Whole sats at ordinary sizes, up to the millisat below 1,000.
    const sats = amount / 1000;
    return Math.abs(sats) < 1000
      ? {
          value: sats,
          options: { maximumFractionDigits: 3 },
        }
      : { value: Math.floor(sats), options: {} };
  }
  const value = amount / smallestUnitScale(currency);
  const abs = Math.abs(value);
  // Two significant digits once the price is under 10 cents (€0.0068/hour).
  const digits =
    abs === 0 || abs >= 0.1
      ? 2
      : Math.min(8, Math.max(2, Math.ceil(-Math.log10(abs)) + 1));
  return {
    value,
    options: {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
      trailingZeroDisplay: "stripIfInteger",
    },
  };
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
  const { value, options } = priceNumber(cost.currency, cost.amount);
  const text = intl.formatNumber(value, options);
  return cost.currency === "BTC" ? `${text} sats` : text;
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
    case "hour":
      return intl.formatMessage(
        { defaultMessage: "{n, plural, one {hour} other {hours}}" },
        { n },
      );
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
 *
 * `interval_type` falls back to month when absent, so a price from an API
 * that hasn't shipped the field yet still reads right instead of printing
 * the literal word "undefined". The count is printed here, not inside
 * `formatIntervalText` — `IntervalSuffix` callers that already show their
 * own count (`payment-flow.tsx`, `vm-billing.tsx`) only want the word from
 * that helper, so the digit belongs at the one call site that needs it.
 */
export function formatPriceWithInterval(
  intl: IntlShape,
  cost: {
    currency: string;
    amount: number;
    interval_type?: string;
    interval_amount?: number;
  },
): string {
  const n = cost.interval_amount ?? 1;
  const interval = formatIntervalText(intl, cost.interval_type ?? "month", n);
  const count = n > 1 ? `${n} ` : "";
  return `${formatPriceText(intl, cost)}/${count}${interval}`;
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

/** Ticker shown for a swap coin, e.g. `USDT` for `USDTTRC`. */
export function coinTicker(coin: string): string {
  return coin === "USDTTRC" ? "USDT" : coin;
}
