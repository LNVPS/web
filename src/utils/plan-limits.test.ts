import { describe, expect, test } from "bun:test";
import type { VmTemplateLimits } from "../api";
import {
  formatPortSpeed,
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

  test("prefers Gbps once it divides evenly", () => {
    expect(formatPortSpeed(1000)).toBe("1Gbps");
    expect(formatPortSpeed(10000)).toBe("10Gbps");
  });

  test("stays in Mbps below a whole gigabit", () => {
    expect(formatPortSpeed(500)).toBe("500Mbps");
    expect(formatPortSpeed(2500)).toBe("2500Mbps");
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
