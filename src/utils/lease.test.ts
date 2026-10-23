import { describe, expect, test } from "bun:test";
import { CostPlanIntervalType, type VmCostPlan } from "../api";
import { expiryStatus, planCycleDays } from "../utils/lease";

const plan = (
  interval_type: CostPlanIntervalType,
  interval_amount = 1,
): VmCostPlan => ({
  id: 1,
  name: "p",
  currency: "EUR",
  amount: 1,
  interval_amount,
  interval_type,
});

const inHours = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();

describe("planCycleDays", () => {
  test("an hour is a fraction of a day", () => {
    expect(planCycleDays(plan(CostPlanIntervalType.HOUR))).toBeCloseTo(1 / 24);
    expect(planCycleDays(plan(CostPlanIntervalType.HOUR, 6))).toBeCloseTo(0.25);
  });
  test("other intervals are unchanged", () => {
    expect(planCycleDays(plan(CostPlanIntervalType.DAY, 7))).toBe(7);
    expect(planCycleDays(plan(CostPlanIntervalType.MONTH))).toBe(30);
  });
});

describe("expiryStatus for an hourly lease", () => {
  const cycle = 1 / 24;
  test("is not 'expiring soon' the moment it is renewed", () => {
    // The old three-day rule flagged every hourly lease as expiring forever.
    const st = expiryStatus(inHours(0.9), cycle);
    expect(st.subDay).toBe(true);
    expect(st.expiringSoon).toBe(false);
  });
  test("warns in the last half cycle, like the server", () => {
    expect(expiryStatus(inHours(0.4), cycle).expiringSoon).toBe(true);
  });
  test("reports time left in seconds, not zero days", () => {
    const st = expiryStatus(inHours(0.5), cycle);
    expect(st.daysLeft).toBe(0);
    expect(st.secondsLeft).toBeGreaterThan(1700);
  });
  test("a lapsed lease is expired", () => {
    expect(expiryStatus(inHours(-1), cycle).expired).toBe(true);
  });
});

describe("expiryStatus for a monthly lease", () => {
  test("keeps the three day warning and whole days", () => {
    const st = expiryStatus(inHours(60), 30); // 2.5 days
    expect(st.subDay).toBe(false);
    expect(st.expiringSoon).toBe(true);
    expect(st.daysLeft).toBe(2);
    expect(expiryStatus(inHours(24 * 10), 30).expiringSoon).toBe(false);
  });
});
