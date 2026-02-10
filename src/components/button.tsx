import classNames from "classnames";
import { forwardRef, HTMLProps, useState } from "react";
import Spinner from "./spinner";

export type AsyncButtonProps = {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
} & Omit<HTMLProps<HTMLButtonElement>, "type" | "ref" | "onClick">;

const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(
  function AsyncButton({ className, onClick, ...props }, ref) {
    const [loading, setLoading] = useState(false);
    const hasBg = className?.includes("bg-");
    return (
      <button
        ref={ref}
        onClick={async (e) => {
          setLoading(true);
          try {
            await onClick?.(e);
          } finally {
            setLoading(false);
          }
        }}
        className={classNames(
          "py-2 px-3 rounded-xl font-medium relative",
          {
            "opacity-50 cursor-not-allowed":
              !hasBg && props.disabled === true,
            "bg-neutral-900": !hasBg,
          },
          className,
        )}
        {...props}
      >
        <span
          style={{ visibility: loading ? "hidden" : "visible" }}
          className="whitespace-nowrap items-center justify-center"
        >
          {props.children}
        </span>
        {loading && (
          <span className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
      </button>
    );
  },
);

export { AsyncButton };
