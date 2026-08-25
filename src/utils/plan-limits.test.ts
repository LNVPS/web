import { describe, expect, test } from "bun:test";
import { diskThroughput, formatPortSpeed, iopsUnits } from "./plan-limits";

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
