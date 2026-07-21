import { useEffect, useState } from "react";
import { VmPayment } from "../api";
import QrCode from "./qr";
import { CostAmount } from "./cost";
import { FormattedMessage } from "react-intl";
import { AsyncButton } from "./button";

/**
 * On-chain Bitcoin payment: shows a BIP21 QR + receive address and polls until
 * the deposit is seen. The backend never rejects a deposit — time is pro-rated
 * by the value received (partial, late and over-payments included) — so the
 * copy explains that the exact amount is a target, not a requirement.
 */
export default function OnChainPayment({
  payment,
  pollPaid,
  pollDetected,
  onPaid,
  onDone,
}: {
  payment: VmPayment;
  /** Resolve true once the payment has settled (source-specific lookup). */
  pollPaid: (paymentId: string) => Promise<boolean>;
  /** Resolve true once a deposit is seen but not yet confirmed (0-conf). */
  pollDetected?: (paymentId: string) => Promise<boolean>;
  onPaid?: () => void;
  /**
   * Leave the flow once the user has broadcast their transaction. On-chain
   * confirmation takes 10+ minutes and crediting is entirely server-side, so
   * there is no reason to hold the user on this screen.
   */
  onDone?: () => void;
}) {
  // Seen in the mempool (0-conf) but not yet confirmed. Set from `outpoint`.
  const [detected, setDetected] = useState(
    "onchain" in payment.data && !!payment.data.onchain.outpoint,
  );

  useEffect(() => {
    const tx = setInterval(async () => {
      try {
        if (await pollPaid(payment.id)) {
          clearInterval(tx);
          onPaid?.();
          return;
        }
        if (!detected && pollDetected && (await pollDetected(payment.id))) {
          setDetected(true);
        }
      } catch (e) {
        console.error(e);
      }
    }, 5_000);
    return () => clearInterval(tx);
  }, [payment.id, pollPaid, pollDetected, detected, onPaid]);

  if (!("onchain" in payment.data)) {
    return (
      <div className="text-cyber-danger">
        <FormattedMessage defaultMessage="This component only supports on-chain payments" />
      </div>
    );
  }

  const address = payment.data.onchain.address;
  // On-chain is BTC-only; amounts are millisats. BIP21 wants decimal BTC.
  const totalMsats = payment.amount + payment.tax + payment.processing_fee;
  const btcAmount = (totalMsats / 1000 / 1e8).toFixed(8);
  const uri = `bitcoin:${address}?amount=${btcAmount}`;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-3 bg-cyber-panel items-center">
      <QrCode
        data={uri}
        link={uri}
        width={512}
        height={512}
        avatar="/logo.jpg"
        className="cursor-pointer rounded-sm overflow-hidden"
      />
      <div className="flex flex-col items-center">
        <div className="text-cyber-primary">
          <CostAmount
            cost={{ currency: payment.currency, amount: totalMsats }}
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
        {address}
      </div>
      {detected ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-cyber-primary/40 bg-cyber-primary/10 px-3 py-2 text-center text-xs text-cyber-primary">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyber-primary" />
          <FormattedMessage defaultMessage="Payment received — waiting for confirmation. Time is credited once it confirms; you can safely leave this page." />
        </div>
      ) : (
        <div className="text-center text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Send on-chain Bitcoin to this address. Time is credited automatically once the transaction confirms, pro-rated by the amount received — partial and over-payments are never lost." />
        </div>
      )}
      {onDone && (
        <div className="flex w-full flex-col items-center gap-2">
          <AsyncButton
            onClick={onDone}
            className="w-full justify-center bg-cyber-primary/20"
          >
            <FormattedMessage defaultMessage="I've sent the payment" />
          </AsyncButton>
          <div className="text-center text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="You can safely leave this page — the payment appears in your billing history and is applied once it confirms." />
          </div>
        </div>
      )}
    </div>
  );
}
