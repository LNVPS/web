import { describe, expect, test } from "bun:test";
import {
  currentSelection,
  upgradeBounds,
  upgradeEffect,
  upgradeRequest,
} from "./upgrade";
import type { VmCustomTemplateParams, VmTemplate } from "../api";
import { GiB } from "../const";

function template(over: Partial<VmTemplate> = {}): VmTemplate {
  return {
    id: 1,
    name: "Custom",
    created: "",
    cpu: 2,
    memory: 4 * GiB,
    disk_size: 80 * GiB,
    disk_type: "ssd",
    disk_interface: "pcie",
    ip4_count: 1,
    ip6_count: 1,
    transfer_gb: 1500,
    limits: { network_mbps: 1000 },
    region: { id: 1, name: "Dublin", company_id: 1 },
    ...over,
  } as VmTemplate;
}

function plan(
  over: Partial<VmCustomTemplateParams> = {},
): VmCustomTemplateParams {
  return {
    id: 7,
    name: "plan",
    region: { id: 1, name: "Dublin", company_id: 1 },
    min_cpu: 1,
    max_cpu: 64,
    min_memory: GiB,
    max_memory: 32 * GiB,
    min_ip4: 1,
    max_ip4: 1,
    min_ip6: 1,
    max_ip6: 1,
    disks: [
      {
        min_disk: 10 * GiB,
        max_disk: 500 * GiB,
        disk_type: "ssd",
        disk_interface: "pcie",
      },
    ],
    transfer: { min: 500, max: 10000, default: 1000 },
    network: { min: 1000, max: 1000, default: 1000 },
    ...over,
  } as VmCustomTemplateParams;
}

describe("upgradeBounds", () => {
  test("runs from what the VM has to what the plan sells", () => {
    expect(upgradeBounds(template(), plan())).toEqual({
      cpu: { min: 2, max: 64 },
      memoryGb: { min: 4, max: 32 },
      diskGb: { min: 80, max: 500 },
      transferGb: { min: 1500, max: 10000 },
      networkMbps: undefined,
    });
  });

  test("never offers less than the VM already has", () => {
    const b = upgradeBounds(
      template({ cpu: 80, disk_type: "hdd" as never }),
      plan(),
    );
    expect(b.cpu).toEqual({ min: 80, max: 80 });
    expect(b.diskGb).toEqual({ min: 80, max: 80 });
  });

  test("an unmetered VM gets no transfer choice", () => {
    expect(
      upgradeBounds(template({ transfer_gb: undefined }), plan()).transferGb,
    ).toBeUndefined();
  });
});

describe("upgradeRequest", () => {
  const t = template();
  const start = currentSelection(upgradeBounds(t, plan()));

  test("asks for nothing when nothing grew", () => {
    expect(upgradeRequest(t, start)).toEqual({});
    expect(upgradeEffect({})).toBe("none");
  });

  test("bandwidth alone applies without a restart", () => {
    const r = upgradeRequest(t, { ...start, transferGb: 3000 });
    expect(r).toEqual({ transfer_gb: 3000 });
    expect(upgradeEffect(r)).toBe("live");
    expect(upgradeEffect({ network_mbps: 2000 })).toBe("live");
  });

  test("compute changes restart the VM and are sent in bytes", () => {
    const r = upgradeRequest(t, {
      ...start,
      cpu: 4,
      memoryGb: 8,
      diskGb: 100,
      transferGb: 2000,
      networkMbps: 2000,
    });
    expect(r).toEqual({
      cpu: 4,
      memory: 8 * GiB,
      disk: 100 * GiB,
      transfer_gb: 2000,
      network_mbps: 2000,
    });
    expect(upgradeEffect(r)).toBe("restart");
  });
});
