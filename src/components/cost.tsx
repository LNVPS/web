import { FormattedMessage, FormattedNumber } from "react-intl";
import useLogin from "../hooks/login";

interface Price {
  currency: string;
  amount: number;
}
type Cost = Price & { interval_type?: string };

export default function CostLabel({
  cost,
}: {
  cost: Cost & { other_price?: Array<Price> };
}) {
  const login = useLogin();

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
}: {
  cost: Cost;
  converted: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      {converted && "~"}
      {cost.currency !== "BTC" ? (
        <FormattedNumber
          value={cost.amount / 100}
          style="currency"
          currency={cost.currency}
          trailingZeroDisplay="stripIfInteger"
        />
      ) : (
        <FormattedNumber value={Math.floor(cost.amount / 1000)} />
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
