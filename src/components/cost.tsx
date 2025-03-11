interface Price {
  currency: string;
  amount: number;
}
type Cost = Price & { interval_type?: string; other_price?: Array<Price> };

export default function CostLabel({
  cost,
  converted,
}: {
  cost: Cost;
  converted?: boolean;
}) {
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

  return (
    <div>
      {converted && "~"}
      {cost.currency !== "BTC"
        ? cost.amount.toFixed(2)
        : Math.floor(cost.amount * 1e8).toLocaleString()}{" "}
      {cost.currency === "BTC" ? "sats" : cost.currency}
      {cost.interval_type && <>/{intervalName(cost.interval_type)}</>}
      {cost.other_price &&
        cost.other_price.map((a) => (
          <div key={a.currency} className="text-xs">
            <CostLabel cost={a} converted={true} />
          </div>
        ))}
    </div>
  );
}
