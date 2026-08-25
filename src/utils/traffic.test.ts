import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import type { VmTrafficSummary } from "../api";
import { GB, formatTransferText, transferUsage } from "./traffic";

const intl = createIntl({ locale: "en" });

function summary(over: Partial<VmTrafficSummary> = {}): VmTrafficSummary {
  return {
    period_start: "2026-08-01",
    period_end: "2026-08-31",
    bytes_out: 0,
    bytes_in: 0,
    ...over,
  };
}

describe("formatTransferText", () => {
  test("uses decimal units, so a full allowance reads as its own size", () => {
    // The trap this exists to avoid: 100 decimal GB in binary units is "93GB".
    expect(formatTransferText(intl, 100 * GB)).toBe("100GB");
  });

  test("scales through B/kB/MB/GB/TB", () => {
    expect(formatTransferText(intl, 512)).toBe("512B");
    expect(formatTransferText(intl, 2_500)).toBe("3kB");
    expect(formatTransferText(intl, 4_500_000)).toBe("4.5MB");
    expect(formatTransferText(intl, 41_231_000_000)).toBe("41.2GB");
    expect(formatTransferText(intl, 2_400_000_000_000)).toBe("2.4TB");
  });

  test("honours the precision argument", () => {
    expect(formatTransferText(intl, 41_231_000_000, 0)).toBe("41GB");
  });
});

describe("transferUsage", () => {
  test("an absent allowance is unmetered, with no bar and no percent", () => {
    const u = transferUsage(summary({ bytes_out: 900 * GB }));
    expect(u.metered).toBe(false);
    expect(u.meterPct).toBe(0);
    expect(u.over).toBe(false);
    expect(u.tone).toBe("muted");
  });

  test("a zero allowance is unmetered, not instantly exhausted", () => {
    expect(
      transferUsage(summary({ transfer_gb: 0, bytes_out: 1 })).metered,
    ).toBe(false);
  });

  test("measures outbound only against the allowance", () => {
    const u = transferUsage(
      summary({ transfer_gb: 100, bytes_out: 50 * GB, bytes_in: 400 * GB }),
    );
    expect(u.allowanceBytes).toBe(100 * GB);
    expect(u.pct).toBeCloseTo(50);
    expect(u.tone).toBe("primary");
    expect(u.over).toBe(false);
  });

  test("warns at 80% and flags danger at 100%, matching the server's emails", () => {
    expect(
      transferUsage(summary({ transfer_gb: 100, bytes_out: 80 * GB })).tone,
    ).toBe("warning");
    expect(
      transferUsage(summary({ transfer_gb: 100, bytes_out: 100 * GB })).tone,
    ).toBe("danger");
  });

  test("an overrun pins the bar at 100 but reports the true percent", () => {
    const u = transferUsage(summary({ transfer_gb: 100, bytes_out: 250 * GB }));
    expect(u.meterPct).toBe(100);
    expect(u.pct).toBeCloseTo(250);
    expect(u.over).toBe(true);
  });
});
