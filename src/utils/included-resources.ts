import type { VmTemplateResponse } from "../api";

/**
 * What the catalog actually includes on every plan, derived from the offers.
 *
 * The home page used to assert "one IPv4 and one IPv6 address and unmetered
 * traffic" as static copy. That is a claim about the *template configuration*,
 * which the operator changes without touching the front end, so it went stale
 * the moment a plan carried a different address count or a transfer allowance.
 * Everything here is read from the same response the plan cards render.
 *
 * A custom plan contributes its floor (`min_ip4`/`min_ip6`): that is what a
 * build from it includes, since anything above the floor is a chosen extra.
 */

export type TransferSummary =
  /** No offer sets an allowance. */
  | { kind: "unmetered" }
  /** Every offer sets the same allowance. */
  | { kind: "same"; gb: number }
  /** Allowances differ, or some offers are metered and others are not. */
  | { kind: "varies" };

export interface IncludedResources {
  /** Lowest IPv4 count across the offers. */
  ip4: number;
  /** Lowest IPv6 count across the offers. */
  ip6: number;
  /** False when the counts differ between offers — then `ip4`/`ip6` are a floor,
   *  not a promise, and the caller must not phrase them as "every plan". */
  uniformIps: boolean;
  transfer: TransferSummary;
}

/**
 * Returns undefined when the catalog is empty or still loading: an empty
 * catalog supports no claim about what a plan includes, and a hardcoded
 * fallback is exactly the failure this function exists to remove.
 */
export function includedResources(
  offers?: VmTemplateResponse,
): IncludedResources | undefined {
  const ip4: Array<number> = [];
  const ip6: Array<number> = [];
  // undefined and 0 both mean unmetered, matching the worker's quota check.
  const transfer: Array<number | undefined> = [];

  for (const t of offers?.templates ?? []) {
    ip4.push(t.ip4_count);
    ip6.push(t.ip6_count);
    transfer.push(t.transfer_gb);
  }
  for (const c of offers?.custom_template ?? []) {
    ip4.push(c.min_ip4);
    ip6.push(c.min_ip6);
    transfer.push(c.transfer_gb);
  }
  if (ip4.length === 0) return undefined;

  const uniform = (xs: Array<number>) => xs.every((x) => x === xs[0]);

  const metered = transfer.map((gb) => (gb !== undefined && gb > 0 ? gb : 0));
  let summary: TransferSummary;
  if (metered.every((gb) => gb === 0)) {
    summary = { kind: "unmetered" };
  } else if (uniform(metered)) {
    summary = { kind: "same", gb: metered[0] };
  } else {
    summary = { kind: "varies" };
  }

  return {
    ip4: Math.min(...ip4),
    ip6: Math.min(...ip6),
    uniformIps: uniform(ip4) && uniform(ip6),
    transfer: summary,
  };
}
