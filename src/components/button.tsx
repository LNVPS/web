import classNames from "classnames";
import { forwardRef, HTMLProps } from "react";

export type AsyncButtonProps = {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
} & Omit<HTMLProps<HTMLButtonElement>, "type" | "ref" | "onClick">;

const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(
  function AsyncButton({ className, ...props }, ref) {
    const hasBg = className?.includes("bg-");
    return (
      <button
        ref={ref}
        className={classNames(
          "py-1 px-2 rounded-xl font-medium",
          {
            "bg-neutral-800 cursor-not-allowed text-neutral-500":
              !hasBg && props.disabled === true,
            "bg-neutral-900": !hasBg && !props.disabled,
          },
          className,
        )}
        {...props}
      >
        {props.children}
      </button>
    );
  },
);

export { AsyncButton };
