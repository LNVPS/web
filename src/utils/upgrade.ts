import type {
  VmCustomTemplateParams,
  VmTemplate,
  VmUpgradeRequest,
} from "../api";
import { GiB } from "../const";
import { bandwidthUpgradeRange } from "./bandwidth";

export interface Bound {
  min: number;
  max: number;
}

export interface UpgradeBounds {
  cpu: Bound;
  memoryGb: Bound;
  diskGb: Bound;
  transferGb?: Bound;
  networkMbps?: Bound;
}

export interface UpgradeSelection {
  cpu: number;
  memoryGb: number;
  diskGb: number;
  transferGb?: number;
  networkMbps?: number;
}

export type UpgradeEffect = "none" | "live" | "restart";

function grow(current: number, planMax: number | undefined): Bound {
  return { min: current, max: Math.max(current, planMax ?? current) };
}

export function upgradeBounds(
  template: VmTemplate,
  plan: VmCustomTemplateParams,
): UpgradeBounds {
  const disk = plan.disks.find(
    (d) =>
      d.disk_type === template.disk_type &&
      d.disk_interface === template.disk_interface,
  );
  const transfer = bandwidthUpgradeRange(plan.transfer, template.transfer_gb);
  const network = bandwidthUpgradeRange(
    plan.network,
    template.limits?.network_mbps,
  );
  return {
    cpu: grow(template.cpu, plan.max_cpu),
    memoryGb: grow(
      Math.ceil(template.memory / GiB),
      Math.floor(plan.max_memory / GiB),
    ),
    diskGb: grow(
      Math.ceil(template.disk_size / GiB),
      disk && Math.floor(disk.max_disk / GiB),
    ),
    transferGb: transfer && { min: transfer.current, max: transfer.max },
    networkMbps: network && { min: network.current, max: network.max },
  };
}

export function currentSelection(bounds: UpgradeBounds): UpgradeSelection {
  return {
    cpu: bounds.cpu.min,
    memoryGb: bounds.memoryGb.min,
    diskGb: bounds.diskGb.min,
    transferGb: bounds.transferGb?.min,
    networkMbps: bounds.networkMbps?.min,
  };
}

export function upgradeRequest(
  template: VmTemplate,
  selection: UpgradeSelection,
): VmUpgradeRequest {
  const request: VmUpgradeRequest = {};
  if (selection.cpu > template.cpu) request.cpu = selection.cpu;
  if (selection.memoryGb * GiB > template.memory)
    request.memory = selection.memoryGb * GiB;
  if (selection.diskGb * GiB > template.disk_size)
    request.disk = selection.diskGb * GiB;
  const transfer = template.transfer_gb;
  if (
    selection.transferGb !== undefined &&
    transfer !== undefined &&
    selection.transferGb > transfer
  )
    request.transfer_gb = selection.transferGb;
  const network = template.limits?.network_mbps;
  if (
    selection.networkMbps !== undefined &&
    network !== undefined &&
    selection.networkMbps > network
  )
    request.network_mbps = selection.networkMbps;
  return request;
}

export function upgradeEffect(request: VmUpgradeRequest): UpgradeEffect {
  if (request.cpu || request.memory || request.disk) return "restart";
  if (request.transfer_gb || request.network_mbps) return "live";
  return "none";
}
