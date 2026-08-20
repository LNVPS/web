import { useEffect, useRef } from "react";
import { VmPayment } from "../api";
import QrCode from "./qr";
import { CostAmount } from "./cost";
import { FormattedMessage } from "react-intl";

export default function VpsPayment({
  payment,
  pollPaid,
  onPaid,
}: {
  payment: VmPayment;
  /**
   * Settlement check from the payment source (subscription payment item
   * endpoint), so this works for every subscription type, not just VMs.
   */
  pollPaid: (paymentId: string) => Promise<boolean>;
  onPaid?: () => void;
}) {
  // Kept in a ref so a parent re-render (which rebuilds the payment source)
  // doesn't restart the poll timer.
  const pollRef = useRef(pollPaid);
  pollRef.current = pollPaid;
  const paidRef = useRef(onPaid);
  paidRef.current = onPaid;

  useEffect(() => {
    const tx = setInterval(async () => {
      try {
        if (await pollRef.current(payment.id)) {
          clearInterval(tx);
          paidRef.current?.();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2_000);
    return () => clearInterval(tx);
  }, [payment.id]);

  // Only works for Lightning payments
  if (!("lightning" in payment.data)) {
    return (
      <div className="text-cyber-danger">
        <FormattedMessage defaultMessage="This component only supports Lightning payments" />
      </div>
    );
  }
  const invoice = payment.data.lightning;
  const ln = `lightning:${invoice}`;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-3 bg-cyber-panel items-center">
      <QrCode
        data={ln}
        link={ln}
        width={512}
        height={512}
        avatar="/avatar.png"
        className="cursor-pointer rounded-sm overflow-hidden"
      />
      <div className="flex flex-col items-center">
        <div className="text-cyber-primary">
          <CostAmount
            cost={{
              currency: payment.currency,
              amount: payment.amount + payment.tax,
            }}
            converted={false}
          />
        </div>
        {payment.tax > 0 && (
          <div className="text-xs text-cyber-muted">
            <FormattedMessage
              defaultMessage="including {amount} tax"
              values={{
                amount: (
                  <CostAmount
                    cost={{ currency: payment.currency, amount: payment.tax }}
                    converted={false}
                  />
                ),
              }}
            />
          </div>
        )}
        {(payment.discount?.amount_off ?? 0) > 0 && (
          <div className="text-xs text-cyber-primary">
            <FormattedMessage
              defaultMessage="after {amount} discount"
              values={{
                amount: (
                  <CostAmount
                    cost={{
                      currency: payment.currency,
                      amount: payment.discount!.amount_off,
                    }}
                    converted={false}
                  />
                ),
              }}
            />
          </div>
        )}
        {payment.processing_fee > 0 && (
          <div className="text-xs text-cyber-muted">
            <FormattedMessage
              defaultMessage="including {amount} processing fee"
              values={{
                amount: (
                  <CostAmount
                    cost={{
                      currency: payment.currency,
                      amount: payment.processing_fee,
                    }}
                    converted={false}
                  />
                ),
              }}
            />
          </div>
        )}
      </div>
      <div className="monospace select-all break-all text-center text-sm text-cyber-text">
        {invoice}
      </div>
    </div>
  );
}
