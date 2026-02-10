import { ReactNode, useState } from "react";

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function Collapsible({
  title,
  defaultOpen,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border-t border-cyber-border pt-4">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <span
          className="text-cyber-muted text-sm transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          &#9654;
        </span>
        <span className="text-lg">{title}</span>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
