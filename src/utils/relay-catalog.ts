import type { App } from "../api";
import { RelayAppSlugs } from "../const";

/**
 * The relay price to claim when the catalog is unreachable or the four relays
 * have drifted apart. `200` is €2.00.
 *
 * Two pages quote this price, so the figure lives here rather than once per
 * page — a landing page has to keep its headline when the API is down, so the
 * price cannot be *only* derived, but it must not sit inside a translatable
 * string either or eleven locale files end up carrying a number only
 * `src/api.ts` should decide.
 */
export const RelayFallbackPrice = { currency: "EUR", amount: 200 };

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
 * The one price the relays share, ex-VAT and unconverted.
 *
 * The copy says "all {price}/month, no setup fee", so only claim a catalog
 * figure when every relay really does agree on it — otherwise fall back, and
 * let whoever changed one relay's price notice the page still reads €2.00.
 */
export function relayPrice(relays: Array<App>): {
  currency: string;
  amount: number;
} {
  const uniform =
    relays.length === RelayAppSlugs.length &&
    relays.every(
      (a) =>
        a.amount === relays[0].amount &&
        a.currency === relays[0].currency &&
        a.setup_amount === 0,
    );
  return uniform
    ? { currency: relays[0].currency, amount: relays[0].amount }
    : RelayFallbackPrice;
}
