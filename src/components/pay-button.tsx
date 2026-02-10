import { VmTemplate } from "../api";
import { useNavigateOrder } from "../hooks/order";
import { AsyncButton } from "./button";

declare global {
  interface Window {
    btcpay?: {
      appendInvoiceFrame(invoiceId: string): void;
    };
  }
}

export default function VpsPayButton({ spec }: { spec: VmTemplate }) {
  const classNames =
    "w-full text-center text-lg uppercase rounded-xl py-3 font-bold cursor-pointer select-none";
  const order = useNavigateOrder();

  return (
    <AsyncButton
      className={`${classNames} bg-green-800`}
      onClick={() =>
        order({
          type: "vm",
          template: spec
        })
      }
    >
      Buy Now
    </AsyncButton>
  );
}
