import { describe, expect, test } from "bun:test";
import type { PaymentData } from "../api";
import { depositOutpoint, isDepositPayment } from "./deposit";

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
