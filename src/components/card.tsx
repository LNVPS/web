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
