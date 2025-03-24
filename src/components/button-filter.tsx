import classNames from "classnames";
import { ReactNode } from "react";

export function FilterButton({ children, onClick, active }: { children: ReactNode, onClick?: () => Promise<void> | void, active?: boolean }) {
    return <div
        className={classNames("rounded-full outline outline-1 px-4 py-1 cursor-pointer select-none",
            {
                "bg-neutral-800 outline-neutral-300": active,
                "bg-neutral-900 outline-neutral-800 text-neutral-500": !active
            }
        )}
        onClick={onClick}>
        {children}
    </div>
}