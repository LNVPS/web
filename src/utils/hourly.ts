import {
  CostPlanIntervalType,
  type AccountCredit,
  type ExchangeRates,
} from "../api";
import { convertAmount } from "./currency";
import { fundedBalances, spendBalance } from "./credit";

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
  /** Currency of the balance the charge would be taken from. */
  balanceCurrency: string;
  /** Funds are held, but none in the currency being charged. */
  otherCurrencyOnly: boolean;
  /** Everything the backend needs is in place. */
  ready: boolean;
}

export function creditReadiness(
  credit: AccountCredit,
  needed?: Money,
  rates?: ExchangeRates,
  applied?: Money | null,
): CreditReadiness {
  const optedIn = credit.auto_apply;
  if (applied !== undefined) {
    const covered = applied !== null && applied.amount > 0;
    const covers = needed
      ? covered && applied.currency === needed.currency
        ? applied.amount >= needed.amount
        : false
      : undefined;
    return {
      optedIn,
      funded: covered,
      covers,
      balanceInNeededCurrency: applied?.amount,
      balanceCurrency: applied?.currency ?? credit.currency,
      otherCurrencyOnly: false,
      ready: optedIn && covered && covers !== false,
    };
  }
  const funded = fundedBalances(credit).length > 0;
  const spend = spendBalance(credit, needed?.currency ?? credit.currency);
  const balanceCurrency = spend?.currency ?? credit.currency;
  let balanceInNeededCurrency: number | undefined;
  let covers: boolean | undefined;
  if (needed) {
    const balance = spend?.balance ?? 0;
    balanceInNeededCurrency =
      balanceCurrency === needed.currency
        ? balance
        : rates
          ? convertAmount(balance, balanceCurrency, needed.currency, rates)
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
    balanceCurrency,
    otherCurrencyOnly:
      !!needed && funded && balanceCurrency !== needed.currency,
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
  const spend = spendBalance(credit, perHour.currency);
  if (!spend) return 0;
  const balance =
    spend.currency === perHour.currency
      ? spend.balance
      : rates
        ? convertAmount(spend.balance, spend.currency, perHour.currency, rates)
        : undefined;
  if (balance === undefined) return undefined;
  return Math.floor(balance / perHour.amount);
}
