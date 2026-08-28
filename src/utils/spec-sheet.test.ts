import { describe, expect, test } from "bun:test";
import {
  formatCpuArch,
  formatCpuMfg,
  formatDiskInterface,
  specSheet,
} from "./spec-sheet";
import { CpuArch, CpuMfg, DiskInterface, type VmTemplate } from "../api";

function template(over: Partial<VmTemplate> = {}): VmTemplate {
  return {
    id: 1,
    name: "Custom",
    created: "",
    cpu: 2,
    memory: 2 * 1024 * 1024 * 1024,
    disk_size: 80 * 1024 * 1024 * 1024,
    disk_type: "ssd",
    disk_interface: "pcie",
    ip4_count: 1,
    ip6_count: 1,
    cost_plan: {
      id: 1,
      name: "m",
      amount: 5,
      currency: "EUR",
      interval_amount: 1,
      interval_type: "month",
    },
    region: {
      id: 1,
      name: "Quebec",
      country_code: "CA",
      company_id: 1,
    },
    ...over,
  } as VmTemplate;
}

describe("formatCpuMfg / formatCpuArch", () => {
  test("known values get their brand casing", () => {
    expect(formatCpuMfg(CpuMfg.INTEL)).toBe("Intel");
    expect(formatCpuMfg(CpuMfg.AMD)).toBe("AMD");
    expect(formatCpuMfg(CpuMfg.APPLE)).toBe("Apple");
    expect(formatCpuMfg(CpuMfg.NVIDIA)).toBe("NVIDIA");
    expect(formatCpuMfg(CpuMfg.ARM)).toBe("ARM");
    expect(formatCpuArch(CpuArch.X86_64)).toBe("x86_64");
    expect(formatCpuArch(CpuArch.ARM64)).toBe("ARM64");
  });

  test("unknown and absent values render nothing rather than a guess", () => {
    expect(formatCpuMfg(undefined)).toBeUndefined();
    expect(formatCpuMfg(CpuMfg.UNKNOWN)).toBeUndefined();
    expect(formatCpuArch(undefined)).toBeUndefined();
    expect(formatCpuArch(CpuArch.UNKNOWN)).toBeUndefined();
  });
});

describe("formatDiskInterface", () => {
  test("a PCIe-attached disk is named the way a buyer knows it", () => {
    expect(formatDiskInterface(DiskInterface.PCIe)).toBe("NVMe");
    expect(formatDiskInterface(DiskInterface.SCSI)).toBe("SCSI");
    expect(formatDiskInterface(DiskInterface.SATA)).toBe("SATA");
  });

  test("an unknown bus renders nothing rather than the raw enum", () => {
    expect(formatDiskInterface(undefined)).toBeUndefined();
    expect(formatDiskInterface("floppy" as DiskInterface)).toBeUndefined();
  });
});

describe("specSheet", () => {
  test("an uncapped offer carries no ceilings at all", () => {
    const s = specSheet(template());
    expect(s.cpu).toEqual({
      cores: 2,
      detail: undefined,
      limitFraction: undefined,
    });
    expect(s.storage.mbps).toBeUndefined();
    expect(s.storage.iops).toBeUndefined();
    expect(s.network).toEqual({ portSpeed: undefined, transferGb: undefined });
    expect(s.firewallRules).toBeUndefined();
    expect(s.region).toEqual({ name: "Quebec", countryCode: "CA" });
    expect(s.addresses).toEqual({ ip4: 1, ip6: 1 });
    expect(s.storage.type).toBe("SSD");
    expect(s.storage.interface).toBe("NVMe");
  });

  test("cpu detail joins manufacturer and architecture when both are pinned", () => {
    expect(
      specSheet(template({ cpu_mfg: CpuMfg.AMD, cpu_arch: CpuArch.X86_64 })).cpu
        .detail,
    ).toBe("AMD x86_64");
    expect(specSheet(template({ cpu_arch: CpuArch.ARM64 })).cpu.detail).toBe(
      "ARM64",
    );
  });

  test("a full core allocation is not a cap", () => {
    expect(
      specSheet(template({ limits: { cpu_limit: 1 } })).cpu.limitFraction,
    ).toBeUndefined();
    expect(
      specSheet(template({ limits: { cpu_limit: 0.5 } })).cpu.limitFraction,
    ).toBe(0.5);
  });

  test("equal read and write caps are marked symmetric", () => {
    const s = specSheet(
      template({
        limits: {
          disk_mbps_read: 200,
          disk_mbps_write: 200,
          disk_iops_read: 5000,
          disk_iops_write: 2500,
        },
      }),
    );
    expect(s.storage.mbps).toEqual({ read: 200, write: 200, symmetric: true });
    expect(s.storage.iops).toEqual({
      read: 5000,
      write: 2500,
      symmetric: false,
    });
  });

  test("bandwidth becomes a port speed, and a zero allowance is unmetered", () => {
    const s = specSheet(
      template({ limits: { network_mbps: 1000 }, transfer_gb: 0 }),
    );
    expect(s.network).toEqual({ portSpeed: "1Gbps", transferGb: undefined });
    expect(specSheet(template({ transfer_gb: 2000 })).network.transferGb).toBe(
      2000,
    );
  });

  test("the firewall ceiling is passed through when the offer sets one", () => {
    expect(
      specSheet(template({ limits: { firewall_rule_limit: 20 } }))
        .firewallRules,
    ).toBe(20);
  });
});
