import { forwardRef, HTMLProps } from "react";

export type AsyncButtonProps = {
  onClick?: (e: React.MouseEvent) => Promise<void>;
} & Omit<HTMLProps<HTMLButtonElement>, "type" | "ref" | "onClick">;

const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(
  function AsyncButton(props, ref) {
    return (
      <button
        ref={ref}
        className="bg-slate-700 py-1 px-2 rounded-xl"
        {...props}
      >
        {props.children}
      </button>
    );
  },
);

export { AsyncButton };
