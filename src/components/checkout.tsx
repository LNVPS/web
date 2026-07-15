import { ReactNode } from "react";
import { Icon } from "./icon";
import { CostAmount } from "./cost";

/**
 * Checkout UI primitives — a small, consistent kit used across every state of
 * the payment flow so the price and the payment options read the same way
 * whether you're picking a method, scanning a Lightning invoice, or waiting on
 * a saved-card charge.
 *
 * Signature element: the order summary is rendered as a terminal "invoice"
 * printout — monospace line items joined by leader dots to a right-aligned
 * amount, which fits an app that is already all monospace with a scanline
 * overlay, and unifies the four different price treatments that existed before.
 */

/** Small uppercase eyebrow that names a step of the checkout. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyber-muted">
      <span className="h-px w-3 bg-cyber-border-bright" />
      {children}
    </div>
  );
}

export interface ReceiptLine {
  label: ReactNode;
  cost: { currency: string; amount: number };
}

/** One receipt row: label · · · · · amount */
function LeaderLine({
  label,
  cost,
  strong,
}: {
  label: ReactNode;
  cost: { currency: string; amount: number };
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className={
          strong
            ? "text-cyber-text-bright font-bold uppercase tracking-wider text-sm"
            : "text-cyber-muted text-sm"
        }
      >
        {label}
      </span>
      <span
        aria-hidden
        className="flex-1 self-end mb-1 border-b border-dotted border-cyber-border"
      />
      <CostAmount
        cost={cost}
        converted={false}
        className={
          strong
            ? "text-cyber-primary font-bold tabular-nums"
            : "text-cyber-text tabular-nums text-sm"
        }
      />
    </div>
  );
}

/** A terminal-style invoice: header chrome, line items, and a bold total. */
export function ReceiptSummary({
  title,
  subtitle,
  lines,
  total,
  note,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  lines: Array<ReceiptLine>;
  total: { currency: string; amount: number };
  note?: ReactNode;
}) {
  return (
    <div className="border border-cyber-border bg-cyber-panel rounded-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border bg-cyber-panel-light">
        <Icon
          name="printer"
          size={14}
          className="text-cyber-primary pointer-events-none"
        />
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-muted">
          {title}
        </span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {subtitle && (
          <div className="text-cyber-text-bright text-sm">{subtitle}</div>
        )}
        <div className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <LeaderLine key={i} label={l.label} cost={l.cost} />
          ))}
        </div>
        <div className="border-t border-dashed border-cyber-border" />
        <LeaderLine label={<>Total</>} cost={total} strong />
        {note && (
          <div className="text-xs text-cyber-muted leading-relaxed">{note}</div>
        )}
      </div>
    </div>
  );
}

/**
 * A single selectable payment option, uniform for every provider and saved
 * card: icon + name + detail on the left, a radio indicator on the right. The
 * actual charge happens from one shared button below the list, so selecting is
 * instant and the order summary can reflect the chosen method's fees.
 */
export function PaymentOptionRow({
  icon,
  title,
  subtitle,
  selected,
  onSelect,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={
        "group w-full flex items-center gap-3 px-3 py-3 border rounded-sm text-left transition-all duration-200 " +
        (selected
          ? "border-cyber-primary bg-cyber-panel-light shadow-neon-sm"
          : "border-cyber-border bg-cyber-panel hover:border-cyber-primary/60")
      }
    >
      <span className="shrink-0 w-9 h-9 rounded-sm bg-cyber-panel-light border border-cyber-border flex items-center justify-center text-cyber-primary">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-cyber-text-bright truncate">{title}</span>
        {subtitle && (
          <span className="block text-xs text-cyber-muted truncate">
            {subtitle}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={
          "shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors " +
          (selected ? "border-cyber-primary" : "border-cyber-border")
        }
      >
        {selected && (
          <span className="w-2 h-2 rounded-full bg-cyber-primary" />
        )}
      </span>
    </button>
  );
}

/** Consistent header for every checkout step, with an optional back control. */
export function CheckoutHeader({
  title,
  onBack,
}: {
  title: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          className="text-cyber-muted hover:text-cyber-primary transition-colors"
        >
          <Icon name="arrow-left" size={20} />
        </button>
      )}
      <div className="text-lg font-bold text-cyber-text-bright">{title}</div>
    </div>
  );
}
