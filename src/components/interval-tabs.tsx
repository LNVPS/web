import classNames from "classnames";
import { useIntl } from "react-intl";
import { CostPlanIntervalType } from "../api";
import { formatIntervalText } from "../utils/currency";
import { intervalKey, type BillingInterval } from "../utils/custom-intervals";

/**
 * Tab strip for choosing a billing interval (MONTHLY | DAILY | HOURLY).
 *
 * Renders nothing for fewer than two intervals: with a single interval there
 * is nothing to choose, and the builder reads exactly as it did before.
 */
export default function IntervalTabs({
  intervals,
  value,
  onChange,
}: {
  intervals: Array<BillingInterval>;
  value: BillingInterval;
  onChange: (i: BillingInterval) => void;
}) {
  const intl = useIntl();
  if (intervals.length < 2) return null;

  function label(i: BillingInterval): string {
    if (i.amount === 1) {
      switch (i.type) {
        case CostPlanIntervalType.HOUR:
          return intl.formatMessage({ defaultMessage: "Hourly" });
        case CostPlanIntervalType.DAY:
          return intl.formatMessage({ defaultMessage: "Daily" });
        case CostPlanIntervalType.MONTH:
          return intl.formatMessage({ defaultMessage: "Monthly" });
        case CostPlanIntervalType.YEAR:
          return intl.formatMessage({ defaultMessage: "Yearly" });
      }
    }
    return `${i.amount} ${formatIntervalText(intl, i.type, i.amount)}`;
  }

  const active = intervalKey(value);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
        {intl.formatMessage({ defaultMessage: "Billing" })}
      </span>
      <div role="tablist" className="flex gap-6 border-b border-cyber-border">
        {intervals.map((i) => {
          const selected = intervalKey(i) === active;
          return (
            <button
              key={intervalKey(i)}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(i)}
              className={classNames(
                "-mb-px border-b-2 px-0.5 pb-2 text-sm uppercase tracking-wider transition-colors duration-200",
                selected
                  ? "border-cyber-primary text-cyber-primary"
                  : "border-transparent text-cyber-muted hover:text-cyber-primary",
              )}
            >
              {label(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
