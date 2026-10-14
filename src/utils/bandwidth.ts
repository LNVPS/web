import type {
  BandwidthRange,
  VmCustomTemplateParams,
  VmTemplate,
  VmUpgradeRequest,
} from "../api";

export function upgradePlan(
  plans: Array<VmCustomTemplateParams>,
  template: VmTemplate,
): VmCustomTemplateParams | undefined {
  if (template.pricing_id) {
    return plans.find((p) => p.id === template.pricing_id);
  }
  return plans.find(
    (p) =>
      p.region.id === template.region.id &&
      p.disks.some(
        (d) =>
          d.disk_type === template.disk_type &&
          d.disk_interface === template.disk_interface,
      ),
  );
}

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

export function withBandwidthUpgrade(
  request: VmUpgradeRequest,
  transferGb: number | undefined,
  currentTransferGb: number | undefined,
  networkMbps: number | undefined,
  currentNetworkMbps: number | undefined,
): VmUpgradeRequest {
  const out = { ...request };
  if (
    transferGb !== undefined &&
    currentTransferGb !== undefined &&
    transferGb > currentTransferGb
  ) {
    out.transfer_gb = transferGb;
  }
  if (
    networkMbps !== undefined &&
    currentNetworkMbps !== undefined &&
    networkMbps > currentNetworkMbps
  ) {
    out.network_mbps = networkMbps;
  }
  return out;
}

export function formatTransferAllowance(gb: number): string {
  if (gb >= 1000) return `${Number((gb / 1000).toFixed(1))}TB`;
  return `${gb}GB`;
}
