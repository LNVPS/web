import type { PaymentData } from "../api";
import { coinTicker } from "./currency";

/**
 * Whether a payment is a Bitcoin deposit rather than an invoice: a plain
 * on-chain address, or a coin swapped into one. Deposits are never rejected
 * (time is pro-rated by what arrives), so they stay payable after `expires`.
 */
export function isDepositPayment(data: PaymentData): boolean {
  return (
    typeof data === "object" && ("onchain" in data || "fixedfloat" in data)
  );
}

/** Whether account credit paid the whole bill, leaving nothing to collect. */
export function isCreditPayment(data: PaymentData): data is "credit" {
  return data === "credit";
}

/** "{txid}:{vout}" of the Bitcoin seen for a deposit payment, if any. */
export function depositOutpoint(data: PaymentData): string | undefined {
  if (typeof data !== "object") return undefined;
  if ("onchain" in data) return data.onchain.outpoint;
  if ("fixedfloat" in data) return data.fixedfloat.outpoint;
  return undefined;
}

/** Method label for a payment row, naming the coin and amount for a swap. */
export function paymentMethodLabel(
  method: string | undefined,
  data: PaymentData,
): string {
  if (typeof data === "object" && "fixedfloat" in data) {
    const { coin, amount } = data.fixedfloat;
    return `${amount} ${coinTicker(coin)}`;
  }
  if (method) return method;
  if (typeof data !== "object") return data;
  if ("lightning" in data) return "lightning";
  if ("revolut" in data) return "revolut";
  if ("onchain" in data) return "onchain";
  return "—";
}
