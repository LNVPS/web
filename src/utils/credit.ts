import type { AccountCredit, AccountCreditBalance } from "../api";

export function creditBalances(credit: AccountCredit): AccountCreditBalance[] {
  const held = credit.balances ?? [];
  const base = held.find((b) => b.currency === credit.currency) ?? {
    currency: credit.currency,
    balance: credit.balance,
  };
  return [base, ...held.filter((b) => b.currency !== credit.currency)];
}

export function fundedBalances(credit: AccountCredit): AccountCreditBalance[] {
  return creditBalances(credit).filter((b) => b.balance > 0);
}

export function hasForeignBalance(credit: AccountCredit): boolean {
  return fundedBalances(credit).some((b) => b.currency !== credit.currency);
}

/**
 * The balance a charge in `currency` is taken from: the one in that currency
 * when it has funds, otherwise the first funded balance (converted by the
 * server). Mirrors the server's quote logic.
 */
export function spendBalance(
  credit: AccountCredit,
  currency: string,
): AccountCreditBalance | undefined {
  const funded = fundedBalances(credit);
  return funded.find((b) => b.currency === currency) ?? funded[0];
}

export function creditSignature(credit: AccountCredit | undefined): string {
  if (!credit) return "none";
  const held = creditBalances(credit)
    .map((b) => `${b.currency}${b.balance}`)
    .join(",");
  return `${credit.auto_apply}:${held}`;
}

export function eventCurrencies(credit: AccountCredit | undefined): string[] {
  return credit ? creditBalances(credit).map((b) => b.currency) : [];
}
