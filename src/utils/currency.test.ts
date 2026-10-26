import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import {
  coinTicker,
  formatIntervalText,
  formatPriceText,
  formatPriceWithInterval,
  priceNumber,
} from "./currency";

const intl = createIntl({ locale: "en", messages: {} });

describe("formatIntervalText", () => {
  test("the word only — no count, callers that already print their own count depend on this", () => {
    expect(formatIntervalText(intl, "month", 1)).toBe("month");
    expect(formatIntervalText(intl, "month", 3)).toBe("months");
    expect(formatIntervalText(intl, "day", 1)).toBe("day");
    expect(formatIntervalText(intl, "year", 2)).toBe("years");
  });

  test("defaults to one when n is omitted", () => {
    expect(formatIntervalText(intl, "month")).toBe("month");
  });

  test("an interval the switch doesn't know passes through unchanged", () => {
    expect(formatIntervalText(intl, "fortnight")).toBe("fortnight");
  });
});

describe("formatPriceWithInterval", () => {
  test("appends the interval to formatPriceText's own figure", () => {
    const cost = { currency: "EUR", amount: 500, interval_type: "month" };
    expect(formatPriceWithInterval(intl, cost)).toBe(
      `${formatPriceText(intl, cost)}/month`,
    );
  });

  test("a BTC price still floors to sats before the interval", () => {
    const cost = { currency: "BTC", amount: 1791986, interval_type: "year" };
    expect(formatPriceWithInterval(intl, cost)).toBe(
      `${formatPriceText(intl, cost)}/year`,
    );
  });

  test("falls back to a monthly default instead of printing 'undefined'", () => {
    const cost = { currency: "EUR", amount: 500 };
    expect(formatPriceWithInterval(intl, cost)).toBe(
      `${formatPriceText(intl, cost)}/month`,
    );
  });

  test("carries interval_amount into both the count and the word", () => {
    const cost = {
      currency: "EUR",
      amount: 1500,
      interval_type: "month",
      interval_amount: 3,
    };
    expect(formatPriceWithInterval(intl, cost)).toBe(
      `${formatPriceText(intl, cost)}/3 months`,
    );
  });
});

describe("coinTicker", () => {
  test("USDTTRC reads as USDT and other coins keep their code", () => {
    expect(coinTicker("USDTTRC")).toBe("USDT");
    expect(coinTicker("XMR")).toBe("XMR");
    expect(coinTicker("LTC")).toBe("LTC");
  });
});

describe("sub-unit prices (hourly)", () => {
  test("a BTC price under 1,000 sats keeps its millisats", () => {
    expect(formatPriceText(intl, { currency: "BTC", amount: 9769 })).toBe(
      "9.769 sats",
    );
    expect(formatPriceText(intl, { currency: "BTC", amount: 1500 })).toBe(
      "1.5 sats",
    );
  });

  test("ordinary BTC prices still floor to whole sats", () => {
    expect(formatPriceText(intl, { currency: "BTC", amount: 6879282 })).toBe(
      "6,879 sats",
    );
  });

  test("a fiat price under 10 cents shows two significant digits", () => {
    expect(formatPriceText(intl, { currency: "EUR", amount: 0.68 })).toBe(
      "€0.0068",
    );
    expect(formatPriceText(intl, { currency: "EUR", amount: 0.0068 })).toBe(
      "€0.000068",
    );
  });

  test("ordinary fiat prices are unchanged", () => {
    expect(formatPriceText(intl, { currency: "EUR", amount: 500 })).toBe("€5");
    expect(formatPriceText(intl, { currency: "EUR", amount: 1234 })).toBe(
      "€12.34",
    );
    expect(priceNumber("EUR", 0).value).toBe(0);
  });
});
