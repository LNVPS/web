import { describe, expect, test } from "bun:test";
import type { AccountCredit } from "../api";
import {
  creditBalances,
  creditSignature,
  eventCurrencies,
  fundedBalances,
  hasForeignBalance,
  spendBalance,
} from "./credit";

const base: AccountCredit = {
  balance: 5_000_000,
  currency: "BTC",
  auto_apply: true,
};
const multi: AccountCredit = {
  ...base,
  balances: [
    { currency: "EUR", balance: 400 },
    { currency: "BTC", balance: 5_000_000 },
    { currency: "USD", balance: 0 },
  ],
};

describe("creditBalances", () => {
  test("falls back to the base balance when balances is absent", () => {
    expect(creditBalances(base)).toEqual([
      { currency: "BTC", balance: 5_000_000 },
    ]);
  });

  test("puts the base currency first", () => {
    expect(creditBalances(multi).map((b) => b.currency)).toEqual([
      "BTC",
      "EUR",
      "USD",
    ]);
  });

  test("shows an empty base balance when only others are listed", () => {
    const c = { ...base, balance: 0, balances: [{ currency: "EUR", balance: 9 }] };
    expect(creditBalances(c).map((b) => b.currency)).toEqual(["BTC", "EUR"]);
  });
});

describe("fundedBalances and hasForeignBalance", () => {
  test("drop empty balances", () => {
    expect(fundedBalances(multi).map((b) => b.currency)).toEqual([
      "BTC",
      "EUR",
    ]);
  });

  test("detect a non-base balance", () => {
    expect(hasForeignBalance(multi)).toBe(true);
    expect(hasForeignBalance(base)).toBe(false);
  });
});

describe("spendBalance", () => {
  test("matching currency first, else first funded", () => {
    expect(spendBalance(multi, "EUR")?.currency).toBe("EUR");
    expect(spendBalance(multi, "USD")?.currency).toBe("BTC");
  });

  test("nothing when everything is empty", () => {
    expect(spendBalance({ ...base, balance: 0 }, "BTC")).toBeUndefined();
  });
});

describe("creditSignature", () => {
  test("changes with any balance or the opt-in", () => {
    expect(creditSignature(undefined)).toBe("none");
    expect(creditSignature(multi)).toBe("true:BTC5000000,EUR400,USD0");
    expect(creditSignature(base)).toBe("true:BTC5000000");
  });
});

describe("eventCurrencies", () => {
  test("lists held currencies", () => {
    expect(eventCurrencies(multi)).toEqual(["BTC", "EUR", "USD"]);
    expect(eventCurrencies(undefined)).toEqual([]);
  });
});
