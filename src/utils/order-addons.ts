import type {
  VmCostPlan,
  VmCustomPrice,
  VmCustomTemplateParams,
  VmTemplate,
} from "../api";

export interface OrderAddons {
  ip4: number;
  ip6: number;
  transferGb?: number;
  networkMbps?: number;
}

export const TRANSFER_STEP_GB = 500;
export const NETWORK_STEP_MBPS = 250;

export function alignedRange(
  min: number,
  max: number,
  step: number,
): { min: number; max: number } {
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
  };
}

export function hasAddons(plan: VmCustomTemplateParams): boolean {
  return (
    plan.max_ip4 > plan.min_ip4 ||
    plan.max_ip6 > plan.min_ip6 ||
    (plan.transfer !== undefined && plan.transfer.max > plan.transfer.min) ||
    (plan.network !== undefined && plan.network.max > plan.network.min)
  );
}

export function addonsFor(
  template: VmTemplate,
  plan?: VmCustomTemplateParams,
): OrderAddons {
  return {
    ip4: template.ip4_count,
    ip6: template.ip6_count,
    transferGb: plan?.transfer
      ? (template.transfer_gb ?? plan.transfer.default)
      : template.transfer_gb,
    networkMbps: plan?.network
      ? (template.limits?.network_mbps ?? plan.network.default)
      : template.limits?.network_mbps,
  };
}

export function withAddons(
  template: VmTemplate,
  addons: OrderAddons,
  price?: VmCustomPrice,
): VmTemplate {
  const costPlan: VmCostPlan = price
    ? {
        ...template.cost_plan,
        amount: price.amount,
        currency: price.currency as VmCostPlan["currency"],
        interval_amount: price.interval_amount,
        interval_type: price.interval_type,
      }
    : template.cost_plan;
  return {
    ...template,
    ip4_count: addons.ip4,
    ip6_count: addons.ip6,
    transfer_gb: addons.transferGb,
    limits: { ...template.limits, network_mbps: addons.networkMbps },
    cost_plan: costPlan,
  };
}
