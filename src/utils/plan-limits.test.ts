import { describe, expect, test } from "bun:test";
import type { VmTemplateLimits } from "../api";
import {
  diskThroughput,
  formatPortSpeed,
  iopsUnits,
  hasPlanLimits,
  headlineLimitRows,
  planLimitRows,
} from "./plan-limits";

const capped: VmTemplateLimits = {
  disk_iops_read: 5000,
  disk_iops_write: 2500,
  disk_mbps_read: 500,
  disk_mbps_write: 250,
  network_mbps: 1000,
  cpu_limit: 0.5,
  firewall_rule_limit: 20,
};

describe("planLimitRows", () => {
  test("an uncapped offer produces no rows at all", () => {
    expect(planLimitRows(undefined, undefined)).toEqual([]);
    expect(planLimitRows({}, undefined)).toEqual([]);
  });

  test("orders rows by what a buyer compares first", () => {
    expect(planLimitRows(capped, 2000).map((r) => r.kind)).toEqual([
      "network",
      "transfer",
      "diskIops",
      "diskThroughput",
      "cpuLimit",
      "firewallRules",
    ]);
  });

  test("pairs read and write into one row, flagging equal caps", () => {
    const [iops] = planLimitRows({
      disk_iops_read: 5000,
      disk_iops_write: 2500,
    });
    expect(iops).toEqual({
      kind: "diskIops",
      read: 5000,
      write: 2500,
      symmetric: false,
    });

    const [same] = planLimitRows({
      disk_iops_read: 5000,
      disk_iops_write: 5000,
    });
    expect(same).toMatchObject({ symmetric: true });
  });

  test("emits a pair row when only one half is capped", () => {
    expect(planLimitRows({ disk_mbps_write: 250 })).toEqual([
      {
        kind: "diskThroughput",
        read: undefined,
        write: 250,
        symmetric: false,
      },
    ]);
  });

  test("a full-core cpu_limit is not a constraint and is not shown", () => {
    expect(planLimitRows({ cpu_limit: 1 })).toEqual([]);
    expect(planLimitRows({ cpu_limit: 0.5 })).toEqual([
      { kind: "cpuLimit", fraction: 0.5 },
    ]);
  });

  test("an unmetered plan contributes no transfer row", () => {
    expect(planLimitRows({}, undefined)).toEqual([]);
    expect(planLimitRows({}, 0)).toEqual([]);
    expect(planLimitRows({}, 2000)).toEqual([{ kind: "transfer", gb: 2000 }]);
  });

  test("a zero firewall rule limit is a real cap, not an absent one", () => {
    expect(planLimitRows({ firewall_rule_limit: 0 })).toEqual([
      { kind: "firewallRules", max: 0 },
    ]);
  });
});

describe("formatPortSpeed", () => {
  test("an uncapped plan states no speed at all", () => {
    expect(formatPortSpeed(undefined)).toBeUndefined();
    expect(formatPortSpeed(0)).toBeUndefined();
  });

  test("names the standard link speeds the way an ethernet port is sold", () => {
    expect(formatPortSpeed(1000)).toBe("1Gbps");
    expect(formatPortSpeed(2500)).toBe("2.5Gbps");
    expect(formatPortSpeed(5000)).toBe("5Gbps");
    expect(formatPortSpeed(10000)).toBe("10Gbps");
    expect(formatPortSpeed(25000)).toBe("25Gbps");
  });

  test("stays in Mbps below a gigabit", () => {
    expect(formatPortSpeed(500)).toBe("500Mbps");
    expect(formatPortSpeed(100)).toBe("100Mbps");
  });
});

describe("iopsUnits", () => {
  test("thousands become k, the way a drive is specified", () => {
    expect(iopsUnits(20000)).toEqual({ value: 20, unit: "k" });
    expect(iopsUnits(2500)).toEqual({ value: 2.5, unit: "k" });
    expect(iopsUnits(1000)).toEqual({ value: 1, unit: "k" });
  });

  test("figures under a thousand are left alone", () => {
    expect(iopsUnits(500)).toEqual({ value: 500, unit: "" });
    expect(iopsUnits(999)).toEqual({ value: 999, unit: "" });
  });
});

describe("diskThroughput", () => {
  test("stays in MB/s below a gigabyte a second", () => {
    expect(diskThroughput(200)).toEqual({ value: 200, unit: "MB/s" });
    expect(diskThroughput(999)).toEqual({ value: 999, unit: "MB/s" });
  });

  test("climbs to GB/s at and above 1,000 MB/s", () => {
    expect(diskThroughput(1000)).toEqual({ value: 1, unit: "GB/s" });
    expect(diskThroughput(2500)).toEqual({ value: 2.5, unit: "GB/s" });
    expect(diskThroughput(7000)).toEqual({ value: 7, unit: "GB/s" });
  });
});

describe("hasPlanLimits", () => {
  test("is false for an uncapped offer, so the section is dropped entirely", () => {
    expect(hasPlanLimits(undefined, undefined)).toBe(false);
    expect(hasPlanLimits({}, 0)).toBe(false);
    // A cap that is deliberately not shown must not keep the heading alive.
    expect(hasPlanLimits({ cpu_limit: 1 }, undefined)).toBe(false);
  });

  test("is true as soon as one cap is worth showing", () => {
    expect(hasPlanLimits({ network_mbps: 1000 })).toBe(true);
    expect(hasPlanLimits({}, 2000)).toBe(true);
  });
});

describe("headlineLimitRows", () => {
  test("keeps only the rate and the volume", () => {
    expect(headlineLimitRows(capped, 2000).map((r) => r.kind)).toEqual([
      "network",
      "transfer",
    ]);
  });

  test("is empty when the plan caps neither", () => {
    expect(headlineLimitRows({ disk_iops_read: 5000 }, undefined)).toEqual([]);
  });
});
