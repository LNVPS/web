import type { App } from "../api";

/** Catalog tag the relay apps carry (`LNVPS/api#258`). */
const RelayTag = "relay";

/**
 * The relay apps from the catalog, in catalog order.
 *
 * Which apps those are is the catalog's answer, not ours: a slug list written
 * here is right about today's catalog and silently wrong the day a relay is
 * added. Empty when the API is unreachable, which is the same thing `/apps`
 * renders in that state.
 */
export function relayApps(apps: Array<App> | undefined): Array<App> {
  return (apps ?? []).filter((a) =>
    a.tags?.some((t) => t.slug === RelayTag),
  );
}

/**
 * The lowest price a set of catalog rows quotes, ex-VAT and unconverted, or
 * `undefined` when there is nothing to quote (`LNVPS/web#67`).
 *
 * The pages that use this phrase it as "from", which is why this is a minimum
 * and not a uniformity test. A written-in constant used whenever the rows
 * disagreed made both landing pages quote a figure that was nobody's price as
 * soon as one price changed in admin. A minimum off the rows we actually have
 * is true whether they agree or not, and the price column on
 * `/nostr-relay-hosting` shows what each one really costs.
 *
 * `undefined`, not a fallback, in the two cases where there is no honest
 * figure:
 *
 * - **no rows** — the catalog is unreachable, so we know no prices at all.
 * - **mixed currencies** — a minimum across currencies would need a conversion
 *   the caller has not asked for and cannot do without rates.
 *
 * Deliberately not gated on how many rows came back: "from" the lowest of the
 * rows we got is still true, and dropping the page's price because one catalog
 * row is missing helps nobody.
 */
export function catalogPriceFrom(
  apps: Array<App>,
): { currency: string; amount: number } | undefined {
  if (apps.length === 0) return undefined;
  const currency = apps[0].currency;
  if (!apps.every((a) => a.currency === currency)) return undefined;
  return { currency, amount: Math.min(...apps.map((a) => a.amount)) };
}

/**
 * Whether every relay we have a row for really has no setup fee, so the copy
 * can say so. Unknown counts as "cannot claim it": with no rows there is
 * nothing behind the sentence.
 */
export function relaysHaveNoSetupFee(relays: Array<App>): boolean {
  return relays.length > 0 && relays.every((a) => a.setup_amount === 0);
}
