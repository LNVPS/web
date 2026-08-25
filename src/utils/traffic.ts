import type { IntlShape } from "react-intl";
import type { BillingTone } from "../components/billing";
import type { VmTrafficSummary } from "../api";

/**
 * Network transfer figures, kept apart from `utils/bytes.ts` on purpose.
 *
 * `formatBytesText` labels *binary* units decimally (a GiB reads "GB"), which
 * is right for memory and disk. A plan's `transfer_gb` allowance is decimal —
 * the server compares `bytes_out` against `transfer_gb * 1_000_000_000` when
 * it decides whether to warn a customer — so rendering usage in GiB against a
 * GB allowance would show "93GB of 100GB" for a VM that had used every byte of
 * it. Everything on a transfer surface uses these units.
 */

/** Bytes in one decimal gigabyte, the unit `transfer_gb` counts. */
export const GB = 1_000_000_000;
const TB = 1_000_000_000_000;
const MB = 1_000_000;
const KB = 1_000;

/** A transfer figure in decimal units: 1kB = 1000B. */
export function formatTransferText(
  intl: IntlShape,
  bytes: number,
  precision = 1,
): string {
  const fmt = (n: number, digits: number) =>
    intl.formatNumber(n, { maximumFractionDigits: digits });

  if (bytes >= TB) return fmt(bytes / TB, precision) + "TB";
  if (bytes >= GB) return fmt(bytes / GB, precision) + "GB";
  if (bytes >= MB) return fmt(bytes / MB, precision) + "MB";
  if (bytes >= KB) return fmt(bytes / KB, 0) + "kB";
  return fmt(bytes, 0) + "B";
}

export interface TransferUsage {
  /** False when the plan carries no allowance — render no bar and no percent. */
  metered: boolean;
  /** The allowance in bytes; 0 when unmetered. */
  allowanceBytes: number;
  /** Outbound usage as a percent of the allowance, 0 when unmetered. */
  pct: number;
  /** Bar fill capped at 100 so an overrun cannot overflow the track. */
  meterPct: number;
  /** True once outbound usage has passed the allowance. */
  over: boolean;
  tone: BillingTone;
}

/**
 * Usage of a plan's monthly allowance. Only `bytes_out` is measured against it:
 * the allowance is outbound-only, and inbound is reported for display alone.
 *
 * A `transfer_gb` of 0 is treated as unmetered, matching the worker, which
 * skips a quota of 0 rather than treating every byte as an overrun.
 */
export function transferUsage(traffic: VmTrafficSummary): TransferUsage {
  const gb = traffic.transfer_gb ?? 0;
  if (gb <= 0) {
    return {
      metered: false,
      allowanceBytes: 0,
      pct: 0,
      meterPct: 0,
      over: false,
      tone: "muted",
    };
  }
  const allowanceBytes = gb * GB;
  const pct = (traffic.bytes_out / allowanceBytes) * 100;
  return {
    metered: true,
    allowanceBytes,
    pct,
    meterPct: Math.min(100, Math.max(0, pct)),
    over: pct >= 100,
    // Mirrors the thresholds the server emails on: a courtesy warning at 80%,
    // and 100% reached. Nothing is throttled or billed at either point.
    tone: pct >= 100 ? "danger" : pct >= 80 ? "warning" : "primary",
  };
}
