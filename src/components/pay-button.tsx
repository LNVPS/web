import { ReactNode } from "react";
import { VmTemplate } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    btcpay?: {
      appendInvoiceFrame(invoiceId: string): void;
    };
  }
}

export default function VpsPayButton({ spec }: { spec: VmTemplate }) {
  const login = useLogin();
  const classNames =
    "w-full text-center text-lg uppercase rounded-xl py-3 font-bold cursor-pointer select-none";
  const navigte = useNavigate();

  function placeholder(inner: ReactNode) {
    return <div className={`${classNames} bg-red-900`}>{inner}</div>;
  }

  if (!spec.enabled) {
    return placeholder("Unavailable");
  }

  if (!login) {
    return placeholder("Please Login");
  }
  return (
    <AsyncButton
      className={`${classNames} bg-green-800`}
      onClick={() =>
        navigte("/order", {
          state: spec,
        })
      }
    >
      Buy Now
    </AsyncButton>
  );
}
