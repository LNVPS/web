import { VmCostPlan } from "../api";

export default function CostLabel({ cost }: { cost: VmCostPlan }) {
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
    <>
      {cost.amount.toFixed(2)} {cost.currency}/
      {intervalName(cost.interval_type)}
    </>
  );
}
