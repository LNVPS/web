import type { BandwidthRange } from "../api";

export interface BandwidthUpgradeRange {
  current: number;
  max: number;
}

export function bandwidthUpgradeRange(
  range: BandwidthRange | undefined,
  current: number | undefined,
): BandwidthUpgradeRange | undefined {
  if (!range || current === undefined || current <= 0) return undefined;
  if (range.max <= current) return undefined;
  return { current, max: range.max };
}

export function formatTransferAllowance(gb: number): string {
  if (gb >= 1000) return `${Number((gb / 1000).toFixed(1))}TB`;
  return `${gb}GB`;
}
