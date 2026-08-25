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
 * A port speed for a dense manifest line: Gbps once it divides evenly, Mbps
 * below that. `network_mbps` is a cap rather than a port specification, so this
 * returns undefined when the offer sets none — an uncapped plan runs at
 * whatever its host provides, which is not a number this API knows.
 */
export function formatPortSpeed(mbps?: number): string | undefined {
  if (mbps === undefined || mbps <= 0) return undefined;
  if (mbps % 1000 === 0) return `${mbps / 1000}Gbps`;
  return `${mbps}Mbps`;
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
