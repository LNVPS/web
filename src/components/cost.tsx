import { FormattedMessage, FormattedNumber } from "react-intl";
import useLogin from "../hooks/login";
import { taxRateFor, useTaxRates } from "../hooks/tax";

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
  cost: Cost & { other_price?: Array<Price> };
  /** Seller company for the VAT rate; falls back to the primary rate. */
  companyId?: number;
}) {
  const login = useLogin();
  const rates = useTaxRates();
  const rate = login?.incTax ? taxRateFor(rates, companyId) : undefined;

  // Gross-up the base price and every converted price by the same rate. The
  // header toggle communicates the inclusive/exclusive state, so no per-price
  // hint is needed here.
  if (rate && rate > 0) {
    cost = {
      ...grossPrice(cost, rate),
      other_price: cost.other_price?.map((p) => grossPrice(p, rate)),
    };
  }

  if (cost.currency === login?.currency) {
    return <CostAmount cost={cost} converted={false} />;
  } else {
    const converted_price = cost.other_price?.find(
      (p) => p.currency === login?.currency,
    );
    if (converted_price) {
      return (
        <div>
          <CostAmount
            cost={{
              ...converted_price,
              interval_type: cost.interval_type,
            }}
            converted={true}
          />{" "}
          <span className="text-xs text-cyber-muted">
            (<CostAmount cost={cost} converted={false} />)
          </span>
        </div>
      );
    } else {
      return <CostAmount cost={cost} converted={false} />;
    }
  }
}

export function IntervalSuffix({
  interval,
  n,
}: {
  interval: string;
  n?: number;
}) {
  const count = n ?? 1;
  switch (interval) {
    case "day":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {day} other {days}}"
          values={{ n: count }}
        />
      );
    case "month":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {month} other {months}}"
          values={{ n: count }}
        />
      );
    case "year":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {year} other {years}}"
          values={{ n: count }}
        />
      );
    default:
      return <>{interval}</>;
  }
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
