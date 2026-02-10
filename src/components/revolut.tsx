import RevolutCheckout from "@revolut/checkout";
import { Mode } from "@revolut/checkout";
import { useEffect, useRef } from "react";

interface RevolutProps {
  token: string;
  onPaid: () => void;
  onCancel?: () => void;
  mode?: Mode;
}

export function RevolutPayWidget({
  token,
  onPaid,
  onCancel,
  mode,
}: RevolutProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    let destroyed = false;

    RevolutCheckout(token, mode ?? "prod").then((instance) => {
      if (destroyed) {
        instance.destroy();
        return;
      }

      instance.embeddedCheckout({
        target: ref.current!,
        createOrder: async () => {
          return { publicId: token };
        },
        onSuccess: () => {
          onPaid();
        },
        onError: ({ error }: { error: Error }) => {
          console.error("Revolut payment error:", error.message);
        },
        onCancel: () => {
          onCancel?.();
        },
      });

      instanceRef.current = instance;
    });

    return () => {
      destroyed = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [token, mode]);

  return <div ref={ref} />;
}
