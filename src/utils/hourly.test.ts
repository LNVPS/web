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

describe("creditReadiness with several balances", () => {
  const both = (over: Partial<AccountCredit> = {}) =>
    credit({
      balance: 0,
      balances: [
        { currency: "BTC", balance: 0 },
        { currency: "EUR", balance: 1000 },
      ],
      ...over,
    });

  test("a refund balance alone counts as funded", () => {
    const r = creditReadiness(both());
    expect(r.funded).toBe(true);
    expect(r.ready).toBe(true);
  });

  test("is checked against the balance in the charged currency", () => {
    const r = creditReadiness(both(), { currency: "EUR", amount: 800 }, rates);
    expect(r.covers).toBe(true);
    expect(r.balanceCurrency).toBe("EUR");
    expect(r.otherCurrencyOnly).toBe(false);
    const short = creditReadiness(
      both(),
      { currency: "EUR", amount: 1200 },
      rates,
    );
    expect(short.covers).toBe(false);
    expect(short.ready).toBe(false);
  });

  test("prefers the matching currency over a bigger base balance", () => {
    const r = creditReadiness(
      both({
        balance: 100_000_000_000,
        balances: [
          { currency: "BTC", balance: 100_000_000_000 },
          { currency: "EUR", balance: 100 },
        ],
      }),
      { currency: "EUR", amount: 500 },
      rates,
    );
    expect(r.balanceCurrency).toBe("EUR");
    expect(r.covers).toBe(false);
  });

  test("flags when only a different currency is held", () => {
    const r = creditReadiness(both(), { currency: "USD", amount: 100 }, {
      base: "BTC",
      rates: { EUR: 50_000, USD: 60_000 },
    } as never);
    expect(r.otherCurrencyOnly).toBe(true);
    expect(r.balanceCurrency).toBe("EUR");
  });

  test("absent balances fall back to the base balance", () => {
    const r = creditReadiness(credit(), { currency: "BTC", amount: 5 });
    expect(r.covers).toBe(true);
    expect(r.balanceCurrency).toBe("BTC");
    expect(r.otherCurrencyOnly).toBe(false);
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
  test("uses the balance in the price currency when one is held", () => {
    const both = credit({
      balance: 10_000_000,
      balances: [
        { currency: "BTC", balance: 10_000_000 },
        { currency: "EUR", balance: 300 },
      ],
    });
    expect(runwayHours(both, { currency: "EUR", amount: 60 }, rates)).toBe(5);
  });

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

describe("creditReadiness with a quote", () => {
  const needed = { currency: "EUR", amount: 400 };
  const eurHolder = credit({
    balance: 0,
    currency: "EUR",
    balances: [{ currency: "BTC", balance: 10_000_000 }],
  });

  test("the quote's credit line makes a foreign balance ready", () => {
    const r = creditReadiness(eurHolder, needed, rates, needed);
    expect(r.funded).toBe(true);
    expect(r.ready).toBe(true);
  });

  test("a quote that applies no credit is never ready", () => {
    const r = creditReadiness(credit(), needed, rates, null);
    expect(r.funded).toBe(false);
    expect(r.ready).toBe(false);
  });

  test("a quote covering part of the bill is not ready", () => {
    const r = creditReadiness(credit(), needed, rates, {
      currency: "EUR",
      amount: 300,
    });
    expect(r.covers).toBe(false);
    expect(r.ready).toBe(false);
  });

  test("without a quote the single-balance rule applies", () => {
    const r = creditReadiness(eurHolder, needed, rates);
    expect(r.otherCurrencyOnly).toBe(true);
  });
});
