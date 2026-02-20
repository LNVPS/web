import classNames from "classnames";

interface SaleTagProps {
  value: number;
  className?: string;
  title?: string;
}

export default function SaleTag({ value, className, title }: SaleTagProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  let borderColor = "";
  let bgColorClass = "";
  let sign = "";

  if (isPositive) {
    borderColor = "border-cyber-danger-dim";
    bgColorClass = "bg-cyber-panel";
    sign = "+";
  } else if (isZero) {
    borderColor = "border-cyber-muted";
    bgColorClass = "bg-cyber-panel";
    sign = "";
  } else {
    borderColor = "border-cyber-success";
    bgColorClass = "bg-cyber-panel";
    sign = "-";
  }

  const displayValue = Math.abs(value);

  return (
    <span
      title={title}
      className={classNames(
        "inline-block px-1 py-0.5 text-[10px] font-semibold uppercase leading-none",
        borderColor,
        bgColorClass,
        "rounded border",
        sign === "+"
          ? "text-cyber-danger"
          : sign === "-"
            ? "text-cyber-success"
            : "text-cyber-text",
        className,
      )}
    >
      {sign}
      {displayValue}%
    </span>
  );
}
