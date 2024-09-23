import { CostInterval, MachineSpec } from "../api";

export default function CostLabel({ cost }: { cost: MachineSpec["cost"] }) {
  function intervalName(n: number) {
    switch (n) {
      case CostInterval.Hour:
        return "Hour";
      case CostInterval.Day:
        return "Day";
      case CostInterval.Month:
        return "Month";
      case CostInterval.Year:
        return "Year";
    }
  }

  return (
    <>
      {cost.count} {cost.currency}/{intervalName(cost.interval)}
    </>
  );
}
