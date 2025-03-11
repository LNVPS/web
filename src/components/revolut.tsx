import RevolutCheckout, { Mode } from "@revolut/checkout";
import { useEffect, useRef } from "react";

interface RevolutProps {
  amount: {
    currency: string;
    amount: number;
  };
  pubkey: string;
  loadOrder: () => Promise<string>;
  onPaid: () => void;
  onCancel?: () => void;
  mode?: string;
}

export function RevolutPayWidget({
  pubkey,
  loadOrder,
  amount,
  onPaid,
  onCancel,
  mode,
}: RevolutProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  async function load(pubkey: string, ref: HTMLDivElement) {
    const { revolutPay } = await RevolutCheckout.payments({
      locale: "auto",
      mode: (mode ?? "sandbox") as Mode,
      publicToken: pubkey,
    });
    ref.innerHTML = "";
    revolutPay.mount(ref, {
      sessionToken: "",
      currency: amount.currency,
      totalAmount: amount.amount,
      createOrder: async () => {
        const id = await loadOrder();
        return {
          publicId: id,
        };
      },
      buttonStyle: {
        cashback: false,
      },
    });
    revolutPay.on("payment", (payload) => {
      console.debug(payload);
      if (payload.type === "success") {
        onPaid();
      }
      if (payload.type === "cancel") {
        onCancel?.();
      }
    });
  }

  useEffect(() => {
    if (ref.current) {
      load(pubkey, ref.current);
    }
  }, [pubkey, ref]);

  return <div ref={ref}></div>;
}
