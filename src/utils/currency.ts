import { ExchangeRates } from "../api";

/**
 * Smallest-unit scale per currency: app amounts are integers in the smallest
 * unit — fiat in cents (÷100 for the standard value) and BTC in millisats
 * (1 BTC = 100,000,000 sats = 100,000,000,000 msats).
 */
export function smallestUnitScale(currency: string): number {
  return currency === "BTC" ? 100_000_000_000 : 100;
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
