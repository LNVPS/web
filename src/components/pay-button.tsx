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

  if (!login) {
    return (
      <AsyncButton
        className={`${classNames} bg-red-900`}
        onClick={() =>
          navigte("/login", {
            state: spec,
          })
        }
      >
        Login To Order
      </AsyncButton>
    );
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
