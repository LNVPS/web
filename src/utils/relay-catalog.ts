import type { App } from "../api";
import { RelayAppSlugs } from "../const";

/**
 * The relay apps from the catalog, in the order `RelayAppSlugs` lists them.
 * Rows the catalog did not return are dropped, so this is shorter than
 * `RelayAppSlugs` when the API is unreachable — empty on a cold server start,
 * which is the same thing `/apps` renders in that state.
 */
export function relayApps(apps: Array<App> | undefined): Array<App> {
  return RelayAppSlugs.map((slug) => apps?.find((a) => a.name === slug)).filter(
    (a) => a !== undefined,
  );
}

/**
 * The lowest price the catalog quotes for a relay, ex-VAT and unconverted, or
 * `undefined` when there is nothing to quote (`LNVPS/web#67`).
 *
 * The pages that use this phrase it as "from", which is why this is a minimum
 * and not a uniformity test. The previous version returned a written-in
 * constant whenever the four relays disagreed on price, so raising one relay's
 * price in admin — an ordinary action, with the API perfectly healthy — made
 * two landing pages claim a €2.00 that was no longer anyone's price. A minimum
 * off the rows we actually have is true whether the relays agree or not, and
 * the price column on `/nostr-relay-hosting` shows what each one really costs.
 *
 * `undefined`, not a fallback, in the two cases where there is no honest
 * figure:
 *
 * - **no rows** — the catalog is unreachable, so we know no prices at all.
 * - **mixed currencies** — a minimum across currencies would need a conversion
 *   the caller has not asked for and cannot do without rates.
 *
 * Deliberately not gated on having all of `RelayAppSlugs`: "from" the lowest
 * of the three rows we got is still true, and dropping the page's price
 * because one catalog row is missing helps nobody.
 */
export function relayPriceFrom(
  relays: Array<App>,
): { currency: string; amount: number } | undefined {
  if (relays.length === 0) return undefined;
  const currency = relays[0].currency;
  if (!relays.every((a) => a.currency === currency)) return undefined;
  return { currency, amount: Math.min(...relays.map((a) => a.amount)) };
}

/**
 * Whether every relay we have a row for really has no setup fee, so the copy
 * can say so. Unknown counts as "cannot claim it": with no rows there is
 * nothing behind the sentence.
 */
export function relaysHaveNoSetupFee(relays: Array<App>): boolean {
  return relays.length > 0 && relays.every((a) => a.setup_amount === 0);
}
