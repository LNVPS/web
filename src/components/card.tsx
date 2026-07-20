import { ReactNode } from "react";
import classNames from "classnames";

/**
 * The terminal-panel card shell shared across the app: a bordered, square-cornered
 * container with an optional header strip and a body. Callers supply background
 * and padding so the same shell can be a billing status card, a settings section,
 * or anything else that wants the same chrome without repeating it.
 */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "overflow-hidden rounded-sm border border-cyber-border",
        className ?? "bg-cyber-panel",
      )}
    >
      {children}
    </section>
  );
}

/** A card's header, separated from the body by a rule. Pass `strip` for the
 * highlighted (panel-light) header treatment. */
export function CardHeader({
  children,
  className,
  strip,
}: {
  children: ReactNode;
  className?: string;
  strip?: boolean;
}) {
  return (
    <div
      className={classNames(
        "border-b border-cyber-border",
        strip && "bg-cyber-panel-light",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The standard card header bar used across every card: the highlighted `strip`
 * treatment, a small uppercase label on the left, and an optional slot on the
 * right (a status pill, a count, actions). This is the single source of truth
 * for what a card header looks like — billing cards and section cards alike.
 */
export function CardTitle({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <CardHeader
      strip
      className={classNames(
        "flex flex-wrap items-center justify-between gap-2 px-4 py-2",
        className,
      )}
    >
      <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-text">
        {children}
      </span>
      {right}
    </CardHeader>
  );
}

/** A card's body. Padding is supplied by the caller. */
export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className ?? "p-4"}>{children}</div>;
}
