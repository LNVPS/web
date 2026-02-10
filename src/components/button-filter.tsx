import classNames from "classnames";
import { ReactNode } from "react";

export function FilterButton({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => Promise<void> | void;
  active?: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded border px-4 py-1 cursor-pointer select-none transition-all duration-200 text-sm",
        {
          "bg-cyber-primary/10 border-cyber-primary text-cyber-primary shadow-neon-sm":
            active,
          "bg-cyber-panel border-cyber-border text-cyber-muted hover:border-cyber-primary hover:text-cyber-primary":
            !active,
        },
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
