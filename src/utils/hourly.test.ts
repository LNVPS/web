import { describe, expect, test } from "bun:test";
import {
  CostPlanIntervalType,
  type AccountCredit,
  type ExchangeRates,
} from "../api";
import { creditReadiness, grossTotal, isHourly, runwayHours } from "./hourly";

const credit = (over: Partial<AccountCredit> = {}): AccountCredit => ({
  balance: 100_000_000_000, // 1 BTC in msat
  currency: "BTC",
  auto_apply: true,
  ...over,
});

// 1 BTC = 50,000 EUR.
const rates = {
  base: "BTC",
  rates: { EUR: 50_000 },
} as unknown as ExchangeRates;

describe("isHourly", () => {
  test("only the hour interval", () => {
    expect(isHourly(CostPlanIntervalType.HOUR)).toBe(true);
    expect(isHourly(CostPlanIntervalType.DAY)).toBe(false);
    expect(isHourly(undefined)).toBe(false);
  });
});

describe("grossTotal", () => {
  test("adds tax and multiplies by the number of periods", () => {
    expect(grossTotal({ currency: "EUR", amount: 100 }, 3, 0.2)).toEqual({
      currency: "EUR",
      amount: 360,
    });
  });
});

describe("creditReadiness", () => {
  test("not ready until the customer opts in, however big the balance", () => {
    const r = creditReadiness(credit({ auto_apply: false }));
    expect(r.optedIn).toBe(false);
    expect(r.ready).toBe(false);
  });

  test("an empty balance is never ready", () => {
    expect(creditReadiness(credit({ balance: 0 })).ready).toBe(false);
  });

  test("opted in with a balance and nothing to compare is ready", () => {
    expect(creditReadiness(credit()).ready).toBe(true);
  });

  test("compares across currencies and reports a shortfall", () => {
    // 0.0001 BTC = 5 EUR = 500 cents.
    const small = credit({ balance: 10_000_000 });
    const short = creditReadiness(
      small,
      { currency: "EUR", amount: 600 },
      rates,
    );
    expect(short.covers).toBe(false);
    expect(short.ready).toBe(false);
    const enough = creditReadiness(
      small,
      { currency: "EUR", amount: 400 },
      rates,
    );
    expect(enough.covers).toBe(true);
    expect(enough.ready).toBe(true);
  });

  test("an unconvertible currency defers to the server", () => {
    const r = creditReadiness(credit(), { currency: "EUR", amount: 1 });
    expect(r.covers).toBeUndefined();
    expect(r.ready).toBe(true);
  });
});

describe("runwayHours", () => {
  test("whole hours the balance lasts", () => {
    // 5 EUR of credit at 0.60 EUR/hour = 8 hours.
    const small = credit({ balance: 10_000_000 });
    expect(runwayHours(small, { currency: "EUR", amount: 60 }, rates)).toBe(8);
  });

  test("unknown without rates or a price", () => {
    expect(
      runwayHours(credit(), { currency: "EUR", amount: 60 }),
    ).toBeUndefined();
    expect(
      runwayHours(credit(), { currency: "BTC", amount: 0 }),
    ).toBeUndefined();
  });
});
