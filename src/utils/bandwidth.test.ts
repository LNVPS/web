import { describe, expect, test } from "bun:test";
import { bandwidthUpgradeRange, formatTransferAllowance } from "./bandwidth";

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

describe("formatTransferAllowance", () => {
  test("switches to TB at a thousand GB", () => {
    expect(formatTransferAllowance(500)).toBe("500GB");
    expect(formatTransferAllowance(1000)).toBe("1TB");
    expect(formatTransferAllowance(2500)).toBe("2.5TB");
  });
});
