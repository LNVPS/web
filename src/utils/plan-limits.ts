import type { VmTemplateLimits } from "../api";

/**
 * Turns an offer's caps into the rows an order surface should show.
 *
 * The API omits a field when it is uncapped, so the whole point here is to
 * never invent a number: an absent cap produces no row, and an empty result
 * means "bounded only by the hardware", which every current offer is.
 *
 * Read and write caps are paired into one row because a buyer compares them
 * together, and a plan that caps them equally should read as one figure rather
 * than the same number twice.
 */

export type PlanLimitRow =
  | { kind: "network"; mbps: number }
  | { kind: "transfer"; gb: number }
  | { kind: "diskIops"; read?: number; write?: number; symmetric: boolean }
  | {
      kind: "diskThroughput";
      read?: number;
      write?: number;
      symmetric: boolean;
    }
  | { kind: "cpuLimit"; fraction: number }
  | { kind: "firewallRules"; max: number };

function pair(
  kind: "diskIops" | "diskThroughput",
  read?: number,
  write?: number,
): PlanLimitRow | undefined {
  if (read === undefined && write === undefined) return undefined;
  return { kind, read, write, symmetric: read === write };
}

/**
 * Ordered by what a buyer actually compares: bandwidth first, then the monthly
 * volume it can move, then storage performance, then the two caps that are
 * rarely set.
 */
export function planLimitRows(
  limits?: VmTemplateLimits,
  transferGb?: number,
): Array<PlanLimitRow> {
  const rows: Array<PlanLimitRow> = [];

  if (limits?.network_mbps !== undefined) {
    rows.push({ kind: "network", mbps: limits.network_mbps });
  }
  if (transferGb !== undefined && transferGb > 0) {
    rows.push({ kind: "transfer", gb: transferGb });
  }

  const iops = pair(
    "diskIops",
    limits?.disk_iops_read,
    limits?.disk_iops_write,
  );
  if (iops) rows.push(iops);

  const mbps = pair(
    "diskThroughput",
    limits?.disk_mbps_read,
    limits?.disk_mbps_write,
  );
  if (mbps) rows.push(mbps);

  // A limit of 1.0 (or more) is the whole of the allocated cores, i.e. not a
  // constraint — showing "100%" would read as a restriction where there is
  // none.
  if (limits?.cpu_limit !== undefined && limits.cpu_limit < 1) {
    rows.push({ kind: "cpuLimit", fraction: limits.cpu_limit });
  }

  if (limits?.firewall_rule_limit !== undefined) {
    rows.push({ kind: "firewallRules", max: limits.firewall_rule_limit });
  }

  return rows;
}

/**
 * A port speed as an ethernet link is named: 100Mbps, 1Gbps, 2.5Gbps, 10Gbps.
 *
 * The rounded-gigabit-only rule printed "2500Mbps" for a 2.5GbE port, which is
 * a speed nobody writes down that way. Anything from a gigabit up is stated in
 * Gbps with at most one decimal, since the standard link speeds (1, 2.5, 5,
 * 10, 25, 40, 100) all land on one.
 *
 * `network_mbps` is a cap rather than a port specification, so this returns
 * undefined when the offer sets none — an uncapped plan runs at whatever its
 * host provides, which is not a number this API knows.
 */
export function formatPortSpeed(mbps?: number): string | undefined {
  if (mbps === undefined || mbps <= 0) return undefined;
  if (mbps >= 1000) {
    const gbps = mbps / 1000;
    // toFixed then strip, so 2.5 keeps its decimal and 10 does not gain one.
    return `${Number(gbps.toFixed(1))}Gbps`;
  }
  return `${mbps}Mbps`;
}

/**
 * An IOPS figure in thousands once it reaches them: 20,000 IOPS is written
 * "20k" on every drive spec sheet, and the full number costs six characters in
 * a cell that already carries four figures. Returns number and suffix apart so
 * the caller can localise the number itself.
 */
export function iopsUnits(iops: number): {
  value: number;
  unit: "" | "k";
} {
  if (iops >= 1000) {
    return { value: Number((iops / 1000).toFixed(1)), unit: "k" };
  }
  return { value: iops, unit: "" };
}

/**
 * A disk throughput cap in the unit its size warrants: MB/s until it reaches a
 * gigabyte a second, GB/s above that. Returns the number and unit separately so
 * the caller can run it through `intl.formatNumber` for grouping and locale.
 */
export function diskThroughput(mbps: number): {
  value: number;
  unit: "MB/s" | "GB/s";
} {
  if (mbps >= 1000) {
    return { value: Number((mbps / 1000).toFixed(2)), unit: "GB/s" };
  }
  return { value: mbps, unit: "MB/s" };
}

/**
 * Whether an offer caps anything at all. Callers use this to drop their own
 * section chrome: a "Performance" heading over an empty list is worse than no
 * heading, and every offer is uncapped today.
 */
export function hasPlanLimits(
  limits?: VmTemplateLimits,
  transferGb?: number,
): boolean {
  return planLimitRows(limits, transferGb).length > 0;
}

/**
 * The subset worth putting on a dense plan card: the rate and the volume. The
 * rest belongs on the order page, where there is room to explain it.
 */
export function headlineLimitRows(
  limits?: VmTemplateLimits,
  transferGb?: number,
): Array<PlanLimitRow> {
  return planLimitRows(limits, transferGb).filter(
    (r) => r.kind === "network" || r.kind === "transfer",
  );
}
