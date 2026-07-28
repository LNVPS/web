import { CostPlanIntervalType } from "../api";
import { smallestUnitScale } from "./currency";

/** Matches `SITE_URL` in `src/components/seo.tsx:5`, for absolute schema URLs. */
export const SITE_URL = "https://lnvps.net";

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
export const BILLING_UNIT: Record<
  CostPlanIntervalType,
  { code: string; text: string }
> = {
  [CostPlanIntervalType.DAY]: { code: "DAY", text: "DAY" },
  [CostPlanIntervalType.MONTH]: { code: "MON", text: "MONTH" },
  [CostPlanIntervalType.YEAR]: { code: "ANN", text: "YEAR" },
};

/**
 * A recurring price in standard units as a plain decimal, for structured data.
 *
 * Undefined for BTC: amounts there are millisats, which two decimal places
 * cannot express — better no `price` than "0.00". The caller emits no `Offer`
 * at all in that case.
 */
export function standardUnitPrice(
  amount: number,
  currency: string,
): string | undefined {
  if (currency === "BTC") return undefined;
  return (amount / smallestUnitScale(currency)).toFixed(2);
}
