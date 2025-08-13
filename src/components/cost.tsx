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
          />
          <CostAmount
            cost={cost}
            converted={false}
            className="text-sm text-neutral-400"
          />
        </div>
      );
    } else {
      return <CostAmount cost={cost} converted={false} />;
    }
  }
}

function intervalName(n: string) {
  switch (n) {
    case "day":
      return "Day";
    case "month":
      return "Month";
    case "year":
      return "Year";
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
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cost.currency,
    trailingZeroDisplay: "stripIfInteger",
  });
  return (
    <span className={className}>
      {converted && "~"}
      {cost.currency !== "BTC"
        ? formatter.format(cost.amount)
        : Math.floor(cost.amount * 1e8).toLocaleString()}
      {cost.currency === "BTC" && " sats"}
      {cost.interval_type && <>/{intervalName(cost.interval_type)}</>}
    </span>
  );
}
