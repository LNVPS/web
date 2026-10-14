import { describe, expect, test } from "bun:test";
import {
  bandwidthUpgradeRange,
  formatTransferAllowance,
  upgradePlan,
  withBandwidthUpgrade,
} from "./bandwidth";
import type { VmCustomTemplateParams, VmTemplate } from "../api";

function plan(over: Partial<VmCustomTemplateParams>): VmCustomTemplateParams {
  return {
    id: 1,
    name: "plan",
    region: { id: 1, name: "r", country_code: "IE", company_id: 1 },
    max_cpu: 8,
    min_cpu: 1,
    min_memory: 1,
    max_memory: 2,
    min_ip4: 1,
    max_ip4: 1,
    min_ip6: 1,
    max_ip6: 1,
    disks: [
      { min_disk: 1, max_disk: 2, disk_type: "ssd", disk_interface: "pcie" },
    ],
    ...over,
  } as VmCustomTemplateParams;
}

function template(over: Partial<VmTemplate>): VmTemplate {
  return {
    id: 9,
    name: "t",
    created: "",
    cpu: 1,
    memory: 1,
    disk_size: 1,
    disk_type: "ssd",
    disk_interface: "pcie",
    ip4_count: 1,
    ip6_count: 1,
    region: { id: 1, name: "r", country_code: "IE", company_id: 1 },
    ...over,
  } as VmTemplate;
}

describe("upgradePlan", () => {
  const plans = [
    plan({ id: 1, region: { id: 2, name: "x", company_id: 1 } as never }),
    plan({ id: 2 }),
    plan({ id: 3 }),
  ];

  test("a custom VM upgrades on its own plan", () => {
    expect(upgradePlan(plans, template({ pricing_id: 3 }))?.id).toBe(3);
  });

  test("a standard VM upgrades on a plan in its region selling its disk", () => {
    expect(upgradePlan(plans, template({}))?.id).toBe(2);
    expect(
      upgradePlan(plans, template({ disk_type: "hdd" } as never)),
    ).toBeUndefined();
  });
});

describe("bandwidthUpgradeRange", () => {
  const range = { min: 500, max: 5000, default: 1000 };

  test("runs from what the VM has to the plan maximum", () => {
    expect(bandwidthUpgradeRange(range, 1000)).toEqual({
      current: 1000,
      max: 5000,
    });
  });

  test("offers nothing on an unmetered VM, an unmetered plan or at the top", () => {
    expect(bandwidthUpgradeRange(range, undefined)).toBeUndefined();
    expect(bandwidthUpgradeRange(range, 0)).toBeUndefined();
    expect(bandwidthUpgradeRange(undefined, 1000)).toBeUndefined();
    expect(bandwidthUpgradeRange(range, 5000)).toBeUndefined();
  });
});

describe("withBandwidthUpgrade", () => {
  test("adds only the values that grow", () => {
    expect(withBandwidthUpgrade({ cpu: 2 }, 2000, 1000, 100, 100)).toEqual({
      cpu: 2,
      transfer_gb: 2000,
    });
    expect(withBandwidthUpgrade({}, 1000, 1000, 500, 100)).toEqual({
      network_mbps: 500,
    });
    expect(withBandwidthUpgrade({}, undefined, 1000, 500, undefined)).toEqual(
      {},
    );
  });
});

describe("formatTransferAllowance", () => {
  test("switches to TB at a thousand GB", () => {
    expect(formatTransferAllowance(500)).toBe("500GB");
    expect(formatTransferAllowance(1000)).toBe("1TB");
    expect(formatTransferAllowance(2500)).toBe("2.5TB");
  });
});
