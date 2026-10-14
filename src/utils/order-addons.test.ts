import { describe, expect, test } from "bun:test";
import { addonsFor, alignedRange, hasAddons, withAddons } from "./order-addons";
import {
  CostPlanIntervalType,
  type VmCustomTemplateParams,
  type VmTemplate,
} from "../api";

function plan(
  over: Partial<VmCustomTemplateParams> = {},
): VmCustomTemplateParams {
  return {
    id: 1,
    name: "plan",
    region: { id: 1, name: "r", company_id: 1 },
    max_cpu: 8,
    min_cpu: 1,
    min_memory: 1,
    max_memory: 2,
    min_ip4: 1,
    max_ip4: 1,
    min_ip6: 1,
    max_ip6: 1,
    disks: [],
    ...over,
  } as VmCustomTemplateParams;
}

function template(over: Partial<VmTemplate> = {}): VmTemplate {
  return {
    id: 0,
    pricing_id: 1,
    name: "Custom",
    created: "",
    cpu: 1,
    memory: 1,
    disk_size: 1,
    disk_type: "ssd",
    disk_interface: "pcie",
    ip4_count: 1,
    ip6_count: 1,
    cost_plan: {
      id: 0,
      name: "custom",
      amount: 100,
      currency: "EUR",
      interval_amount: 1,
      interval_type: "month",
    },
    region: { id: 1, name: "r", company_id: 1 },
    ...over,
  } as VmTemplate;
}

describe("alignedRange", () => {
  test("widens the track to whole steps", () => {
    expect(alignedRange(500, 10000, 500)).toEqual({ min: 500, max: 10000 });
    expect(alignedRange(100, 10000, 250)).toEqual({ min: 0, max: 10000 });
    expect(alignedRange(300, 1100, 250)).toEqual({ min: 250, max: 1250 });
  });
});

describe("hasAddons", () => {
  test("is true only when something can be chosen", () => {
    expect(hasAddons(plan())).toBe(false);
    expect(hasAddons(plan({ max_ip4: 2 }))).toBe(true);
    expect(hasAddons(plan({ max_ip6: 2 }))).toBe(true);
    expect(
      hasAddons(plan({ transfer: { min: 1000, max: 1000, default: 1000 } })),
    ).toBe(false);
    expect(
      hasAddons(plan({ transfer: { min: 500, max: 1000, default: 1000 } })),
    ).toBe(true);
    expect(
      hasAddons(plan({ network: { min: 100, max: 1000, default: 100 } })),
    ).toBe(true);
  });
});

describe("addonsFor", () => {
  test("starts from the spec and falls back to the plan default", () => {
    const p = plan({
      transfer: { min: 500, max: 5000, default: 1000 },
      network: { min: 100, max: 1000, default: 500 },
    });
    expect(addonsFor(template(), p)).toEqual({
      ip4: 1,
      ip6: 1,
      transferGb: 1000,
      networkMbps: 500,
    });
    expect(
      addonsFor(
        template({ transfer_gb: 3000, limits: { network_mbps: 200 } }),
        p,
      ),
    ).toEqual({ ip4: 1, ip6: 1, transferGb: 3000, networkMbps: 200 });
    expect(addonsFor(template(), plan())).toEqual({
      ip4: 1,
      ip6: 1,
      transferGb: undefined,
      networkMbps: undefined,
    });
  });
});

describe("withAddons", () => {
  test("puts the choices and the quoted price on the spec", () => {
    const out = withAddons(
      template({ limits: { disk_iops_read: 5 } }),
      { ip4: 2, ip6: 0, transferGb: 2000, networkMbps: 300 },
      {
        currency: "EUR",
        amount: 450,
        interval_amount: 1,
        interval_type: CostPlanIntervalType.MONTH,
      },
    );
    expect(out.ip4_count).toBe(2);
    expect(out.ip6_count).toBe(0);
    expect(out.transfer_gb).toBe(2000);
    expect(out.limits).toEqual({ disk_iops_read: 5, network_mbps: 300 });
    expect(out.cost_plan.amount).toBe(450);
  });

  test("keeps the old price until a quote arrives", () => {
    const out = withAddons(template(), { ip4: 1, ip6: 1 });
    expect(out.cost_plan.amount).toBe(100);
  });
});
