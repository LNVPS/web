import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import { formatIntervalText, formatPriceText, formatPriceWithInterval } from "./currency";

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
