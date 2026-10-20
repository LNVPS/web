import type { PaymentData } from "../api";

/**
 * Whether a payment is a Bitcoin deposit rather than an invoice: a plain
 * on-chain address, or a coin swapped into one. Deposits are never rejected
 * (time is pro-rated by what arrives), so they stay payable after `expires`.
 */
export function isDepositPayment(data: PaymentData): boolean {
  return "onchain" in data || "fixedfloat" in data;
}

/** "{txid}:{vout}" of the Bitcoin seen for a deposit payment, if any. */
export function depositOutpoint(data: PaymentData): string | undefined {
  if ("onchain" in data) return data.onchain.outpoint;
  if ("fixedfloat" in data) return data.fixedfloat.outpoint;
  return undefined;
}
