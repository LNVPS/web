import { describe, expect, test } from "bun:test";
import type { PaymentData } from "../api";
import {
  depositOutpoint,
  isDepositPayment,
  paymentMethodLabel,
} from "./deposit";

const onchain = (outpoint?: string): PaymentData => ({
  onchain: { address: "bc1q", outpoint },
});
const swap = (outpoint?: string): PaymentData => ({
  fixedfloat: { coin: "XMR", address: "4abc", amount: "0.3", outpoint },
});

describe("isDepositPayment", () => {
  test("on-chain and coin swaps are deposits, invoices are not", () => {
    expect(isDepositPayment(onchain())).toBe(true);
    expect(isDepositPayment(swap())).toBe(true);
    expect(isDepositPayment({ lightning: "lnbc1" })).toBe(false);
    expect(isDepositPayment({ revolut: { token: "t" } })).toBe(false);
  });
});

describe("depositOutpoint", () => {
  test("reads the outpoint from either deposit kind", () => {
    expect(depositOutpoint(onchain("aa:0"))).toBe("aa:0");
    expect(depositOutpoint(swap("bb:1"))).toBe("bb:1");
  });

  test("is undefined before a deposit is seen and for invoices", () => {
    expect(depositOutpoint(onchain())).toBeUndefined();
    expect(depositOutpoint(swap())).toBeUndefined();
    expect(depositOutpoint({ lightning: "lnbc1" })).toBeUndefined();
  });
});

describe("paymentMethodLabel", () => {
  test("a swap shows the coin amount and ticker", () => {
    expect(paymentMethodLabel("fixedfloat", swap())).toBe("0.3 XMR");
    expect(
      paymentMethodLabel("fixedfloat", {
        fixedfloat: { coin: "USDTTRC", address: "T", amount: "83.5" },
      }),
    ).toBe("83.5 USDT");
  });

  test("other payments keep the server's method, else infer from the data", () => {
    expect(paymentMethodLabel("revolut", { revolut: { token: "t" } })).toBe(
      "revolut",
    );
    expect(paymentMethodLabel(undefined, { lightning: "lnbc1" })).toBe(
      "lightning",
    );
    expect(paymentMethodLabel(undefined, { revolut: { token: "t" } })).toBe(
      "revolut",
    );
    expect(paymentMethodLabel(undefined, onchain())).toBe("onchain");
    expect(paymentMethodLabel(undefined, { stripe: { session_id: "s" } })).toBe(
      "—",
    );
  });
});
