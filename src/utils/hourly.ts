import {
  CostPlanIntervalType,
  type AccountCredit,
  type ExchangeRates,
} from "../api";
import { convertAmount } from "./currency";

/**
 * Hourly billing is paid from account credit only (the backend refuses an
 * hourly renewal, purchase or upgrade unless the customer's credit covers the
 * whole bill *and* they have opted in with `auto_apply`). Nothing is ever
 * invoiced, so every surface that would normally offer Lightning, card or
 * on-chain has to offer credit instead. These helpers are the one place that
 * mirrors that rule, so the order page, the builder and the checkout agree.
 */

export function isHourly(intervalType?: string): boolean {
  return intervalType === CostPlanIntervalType.HOUR;
}

export interface Money {
  currency: string;
  amount: number;
}

/** What a bill of `intervals` periods costs once tax is added, in `cost`'s unit. */
export function grossTotal(
  cost: Money,
  intervals: number,
  taxRate: number,
): Money {
  return {
    currency: cost.currency,
    amount: Math.round(cost.amount * intervals * (1 + taxRate)),
  };
}

export interface CreditReadiness {
  /** The customer has turned on "apply credit automatically". */
  optedIn: boolean;
  /** The balance is greater than zero. */
  funded: boolean;
  /**
   * Whether the balance covers `needed`; undefined when nothing was asked
   * about or the balance could not be converted to its currency (the server
   * then has the final say).
   */
  covers: boolean | undefined;
  /** The balance expressed in the currency of `needed`, when convertible. */
  balanceInNeededCurrency: number | undefined;
  /** Everything the backend needs is in place. */
  ready: boolean;
}

export function creditReadiness(
  credit: AccountCredit,
  needed?: Money,
  rates?: ExchangeRates,
): CreditReadiness {
  const optedIn = credit.auto_apply;
  const funded = credit.balance > 0;
  let balanceInNeededCurrency: number | undefined;
  let covers: boolean | undefined;
  if (needed) {
    balanceInNeededCurrency =
      credit.currency === needed.currency
        ? credit.balance
        : rates
          ? convertAmount(
              credit.balance,
              credit.currency,
              needed.currency,
              rates,
            )
          : undefined;
    if (balanceInNeededCurrency !== undefined) {
      covers = balanceInNeededCurrency >= needed.amount;
    }
  }
  return {
    optedIn,
    funded,
    covers,
    balanceInNeededCurrency,
    ready: optedIn && funded && covers !== false,
  };
}

/**
 * Whole hours the balance keeps a machine billed at `perHour` running, or
 * undefined when the balance cannot be compared with the price.
 */
export function runwayHours(
  credit: AccountCredit,
  perHour: Money,
  rates?: ExchangeRates,
): number | undefined {
  if (perHour.amount <= 0) return undefined;
  const balance =
    credit.currency === perHour.currency
      ? credit.balance
      : rates
        ? convertAmount(
            credit.balance,
            credit.currency,
            perHour.currency,
            rates,
          )
        : undefined;
  if (balance === undefined) return undefined;
  return Math.floor(balance / perHour.amount);
}
