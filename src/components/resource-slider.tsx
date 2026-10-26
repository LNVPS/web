import { ReactNode, useState } from "react";
import { alignedRange } from "../utils/order-addons";

/** One compact resource row: label · slider · editable value. */
export default function ResourceSlider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  scaledUnit,
  onChange,
}: {
  label: ReactNode;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  scaledUnit?: { unit: string; factor: number };
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const track = alignedRange(min, max, step);
  const [draft, setDraft] = useState<string>();
  const scaled = scaledUnit !== undefined && value >= scaledUnit.factor;
  const factor = scaled ? scaledUnit.factor : 1;
  const shownUnit = scaled ? scaledUnit.unit : unit;
  const shown = draft ?? String(Number((value / factor).toFixed(2)));
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
        {label}
      </span>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(clamp(e.target.valueAsNumber))}
        min={track.min}
        max={track.max}
        step={step}
        className="min-w-0 grow"
      />
      <div className="flex shrink-0 items-baseline justify-end gap-1.5">
        <input
          type="number"
          value={shown}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(clamp(Math.round(v * factor)));
          }}
          onBlur={() => setDraft(undefined)}
          min={min / factor}
          max={max / factor}
          step={step / factor}
          // Inline padding/border override the higher-specificity global
          // `input` rule; width sizes to the digit count (4-digit floor).
          style={{
            width: `${Math.max(4, shown.length) + 1}ch`,
            padding: 0,
            border: "none",
          }}
          className="bg-transparent text-right text-lg leading-none text-cyber-text-bright tabular-nums focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="w-10 text-[0.65rem] uppercase tracking-wider text-cyber-muted">
          {shownUnit}
        </span>
      </div>
    </div>
  );
}
