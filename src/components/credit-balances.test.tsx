import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountCredit } from "../api";
import { priceNumber } from "../utils/currency";

mock.module("./cost", () => ({
  CostAmount: ({
    cost,
  }: {
    cost: { currency: string; amount: number };
  }) => {
    const p = priceNumber(cost.currency, cost.amount);
    return (
      <span>
        {cost.currency}:{p.value}
      </span>
    );
  },
}));

const { default: CreditBalances } = await import("./credit-balances");

const render = (credit: AccountCredit, large?: boolean) =>
  renderToStaticMarkup(<CreditBalances credit={credit} large={large} />);

describe("CreditBalances", () => {
  test("shows a EUR refund balance after the BTC base balance", () => {
    const html = render({
      balance: 5_000_000_000,
      currency: "BTC",
      auto_apply: true,
      balances: [
        { currency: "EUR", balance: 1250 },
        { currency: "BTC", balance: 5_000_000_000 },
      ],
    });
    expect(html).toContain("BTC:5000000");
    expect(html).toContain("EUR:12.5");
    expect(html.indexOf("BTC:")).toBeLessThan(html.indexOf("EUR:"));
  });

  test("large layout renders every balance", () => {
    const html = render(
      {
        balance: 0,
        currency: "BTC",
        auto_apply: true,
        balances: [{ currency: "EUR", balance: 100 }],
      },
      true,
    );
    expect(html).toContain("BTC:0");
    expect(html).toContain("EUR:1");
    expect(html).toContain("text-3xl");
  });

  test("shows only the base balance when balances is absent", () => {
    const html = render({
      balance: 2_000_000,
      currency: "BTC",
      auto_apply: false,
    });
    expect(html).toContain("BTC:2000");
    expect(html).not.toContain("EUR");
  });
});
