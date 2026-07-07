import classNames from "classnames";
import useToasts from "../hooks/toast";
import { ToastState } from "../toast";

export default function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-96">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={classNames(
            "flex items-start justify-between gap-3 rounded-sm border px-4 py-3 shadow-neon-sm text-sm",
            {
              "border-cyber-danger bg-cyber-danger/10 text-cyber-danger":
                t.type === "error",
              "border-cyber-primary bg-cyber-primary/10 text-cyber-primary":
                t.type === "success",
              "border-cyber-border bg-cyber-panel text-cyber-text":
                t.type === "info",
            },
          )}
        >
          <span className="break-words min-w-0">{t.message}</span>
          <button
            onClick={() => ToastState.dismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100 leading-none text-base"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
