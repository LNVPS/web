/**
 * How an offer's caps are written down.
 *
 * Only the order page shows caps now, and it renders them itself; what lives
 * here is the unit vocabulary, so a port speed, a throughput ceiling and an
 * IOPS figure are spelled the same way wherever they appear.
 */

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
export function iopsUnits(iops: number): { value: number; unit: "" | "k" } {
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
