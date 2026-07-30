import { FormattedNumber, useIntl } from "react-intl";
import useLogin from "../hooks/login";
import { taxRateFor, useTaxRates } from "../hooks/tax";
import useExchangeRates from "../hooks/useExchangeRates";
import { convertAmount, formatIntervalText } from "../utils/currency";

interface Price {
  currency: string;
  amount: number;
}
type Cost = Price & { interval_type?: string };

function grossPrice<T extends Price>(p: T, rate: number): T {
  return { ...p, amount: Math.round(p.amount * (1 + rate / 100)) };
}

export default function CostLabel({
  cost,
  companyId,
}: {
  cost: Cost;
  /** Seller company for the VAT rate; falls back to the primary rate. */
  companyId?: number;
}) {
  const login = useLogin();
  const taxRates = useTaxRates();
  const { data: fx } = useExchangeRates();
  const rate = login?.incTax ? taxRateFor(taxRates, companyId) : undefined;

  // Gross-up the base price by the VAT rate (the header toggle communicates
  // the inclusive/exclusive state, so no per-price hint is needed).
  const base = rate && rate > 0 ? grossPrice(cost, rate) : cost;

  const target = login?.currency;
  if (!target || base.currency === target) {
    return <CostAmount cost={base} converted={false} />;
  }

  // Convert to the display currency from the exchange-rate cache. Defer to the
  // base figure when rates aren't loaded or the pair is unknown.
  const converted = fx
    ? convertAmount(base.amount, base.currency, target, fx)
    : undefined;
  if (converted === undefined) {
    return <CostAmount cost={base} converted={false} />;
  }
  return (
    <div>
      <CostAmount
        cost={{
          currency: target,
          amount: Math.round(converted),
          interval_type: base.interval_type,
        }}
        converted={true}
      />{" "}
      <span className="text-xs text-cyber-muted">
        (<CostAmount cost={base} converted={false} />)
      </span>
    </div>
  );
}

export function IntervalSuffix({
  interval,
  n,
}: {
  interval: string;
  n?: number;
}) {
  const intl = useIntl();
  return <>{formatIntervalText(intl, interval, n ?? 1)}</>;
}

export function CostAmount({
  cost,
  converted,
  className,
  taxable,
  companyId,
}: {
  cost: Cost;
  converted: boolean;
  className?: string;
  /**
   * Gross-up with the account VAT rate when the header "incl. tax" toggle is
   * on. Only set this on real prices — never on earnings or tax-line amounts.
   */
  taxable?: boolean;
  /** Seller company for the VAT rate; falls back to the primary rate. */
  companyId?: number;
}) {
  const login = useLogin();
  const rates = useTaxRates();
  let amount = cost.amount;
  if (taxable && login?.incTax) {
    const rate = taxRateFor(rates, companyId);
    if (rate && rate > 0) amount = Math.round(amount * (1 + rate / 100));
  }
  return (
    <span className={className}>
      {converted && "~"}
      {cost.currency !== "BTC" ? (
        <FormattedNumber
          value={amount / 100}
          style="currency"
          currency={cost.currency}
          trailingZeroDisplay="stripIfInteger"
        />
      ) : (
        <FormattedNumber value={Math.floor(amount / 1000)} />
      )}
      {cost.currency === "BTC" && " sats"}
      {cost.interval_type && (
        <>
          /<IntervalSuffix interval={cost.interval_type} />
        </>
      )}
    </span>
  );
}
