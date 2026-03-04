import { FormattedMessage, useIntl } from "react-intl";
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

export function IntervalName({ interval }: { interval: string }) {
  switch (interval) {
    case "day":
      return <FormattedMessage defaultMessage="Day" />;
    case "month":
      return <FormattedMessage defaultMessage="Month" />;
    case "year":
      return <FormattedMessage defaultMessage="Year" />;
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
  const { locale } = useIntl();
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cost.currency,
    trailingZeroDisplay: "stripIfInteger",
  });
  return (
    <span className={className}>
      {converted && "~"}
      {cost.currency !== "BTC"
        ? formatter.format(cost.amount / 100)
        : Math.floor(cost.amount / 1000).toLocaleString(locale)}
      {cost.currency === "BTC" && " sats"}
      {cost.interval_type && (
        <>
          /<IntervalName interval={cost.interval_type} />
        </>
      )}
    </span>
  );
}
