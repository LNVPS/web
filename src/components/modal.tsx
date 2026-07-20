import classNames from "classnames";
import React, { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";

export interface ModalProps {
  id: string;
  className?: string;
  bodyClassName?: string;
  onClose?: (e: React.MouseEvent | KeyboardEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  children?: ReactNode;
  showClose?: boolean;
  ready?: boolean;
  largeModal?: boolean;
}

export default function Modal(props: ModalProps) {
  const { formatMessage } = useIntl();
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.onClose) {
      props.onClose(e);
    }
  };

  useEffect(() => {
    document.body.classList.add("scroll-lock");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("scroll-lock");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onClose?.(e);
  };

  // createPortal requires a DOM target — skip during SSR.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={classNames(
        "z-[42] w-screen h-screen top-0 left-0 fixed flex justify-center overflow-y-auto",
        "bg-black/80 backdrop-blur-sm p-4 sm:p-6",
        "animate-modal-backdrop motion-reduce:animate-none",
      )}
      onMouseDown={handleBackdropClick}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className={
          props.bodyClassName ??
          classNames(
            "relative overflow-hidden bg-cyber-panel border border-cyber-border shadow-neon rounded-lg",
            "p-6 sm:p-8 h-fit",
            "animate-modal-panel motion-reduce:animate-none",
            "max-xl:mt-auto lg:my-auto max-lg:w-full",
            {
              "max-xl:-translate-y-[calc(100vh-100dvh)]": props.ready ?? true,
              "max-xl:translate-y-[50vh]": !(props.ready ?? true),
              "lg:w-[50vw]": !(props.largeModal ?? false),
              "lg:w-[80vw]": props.largeModal ?? false,
            },
          )
        }
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick?.(e);
        }}
      >
        {/* Quiet neon top hairline — the modal's signature edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-primary/60 to-transparent"
        />
        {(props.showClose ?? true) && (
          <button
            type="button"
            aria-label={formatMessage({ defaultMessage: "Close" })}
            onClick={(e) => {
              e.stopPropagation();
              props.onClose?.(e);
            }}
            className={classNames(
              "absolute right-3 top-3 grid place-items-center w-8 h-8 rounded-sm",
              "border border-cyber-border/60 text-cyber-muted transition-colors duration-150",
              "hover:border-cyber-danger hover:text-cyber-danger",
              "focus-visible:outline-none focus-visible:border-cyber-danger focus-visible:text-cyber-danger",
            )}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 1.5l11 11M12.5 1.5l-11 11"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        {props.children}
      </div>
    </div>,
    document.body,
  ) as React.JSX.Element;
}
