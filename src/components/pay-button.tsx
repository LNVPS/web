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
    "w-full text-center text-lg uppercase rounded-sm py-3 font-bold cursor-pointer select-none";
  const order = useNavigateOrder();

  return (
    <AsyncButton
      className={`${classNames} bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon`}
      onClick={() =>
        order({
          type: "vm",
          template: spec,
        })
      }
    >
      Buy Now
    </AsyncButton>
  );
}
