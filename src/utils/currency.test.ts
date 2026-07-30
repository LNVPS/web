import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import { formatIntervalText, formatPriceText, formatPriceWithInterval } from "./currency";

const intl = createIntl({ locale: "en", messages: {} });

describe("formatIntervalText", () => {
  test("singular at one, plural above it", () => {
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
});
