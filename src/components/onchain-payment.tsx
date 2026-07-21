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
  /** Resolve the amended payment once a deposit is seen (0-conf, re-priced). */
  pollDetected?: (paymentId: string) => Promise<VmPayment | undefined>;
  onPaid?: () => void;
  /**
   * Leave the flow once the user has broadcast their transaction. On-chain
   * confirmation takes 10+ minutes and crediting is entirely server-side, so
   * there is no reason to hold the user on this screen.
   */
  onDone?: () => void;
}) {
  // The amended payment once a deposit is seen in the mempool (0-conf) but not
  // yet confirmed. The server re-prices on discovery, so this carries the
  // re-calculated credited `time` the deposit actually buys.
  const initialSeen =
    "onchain" in payment.data && payment.data.onchain.outpoint
      ? payment
      : undefined;
  const [detectedPayment, setDetectedPayment] = useState<VmPayment | undefined>(
    initialSeen,
  );
  const detected = !!detectedPayment;
  const outpoint =
    detectedPayment && "onchain" in detectedPayment.data
      ? detectedPayment.data.onchain.outpoint
      : undefined;
  const txid = outpoint?.split(":")[0];
  // Re-priced duration this deposit credits (may differ from the quote on a
  // partial/over-payment or an exchange-rate move since the invoice).
  const creditedDays = detectedPayment
    ? Math.max(1, Math.round(detectedPayment.time / 86_400))
    : undefined;

  useEffect(() => {
    const tx = setInterval(async () => {
      try {
        if (await pollPaid(payment.id)) {
          clearInterval(tx);
          onPaid?.();
          return;
        }
        if (!detectedPayment && pollDetected) {
          const seen = await pollDetected(payment.id);
          if (seen) setDetectedPayment(seen);
        }
      } catch (e) {
        console.error(e);
      }
    }, 5_000);
    return () => clearInterval(tx);
  }, [payment.id, pollPaid, pollDetected, detectedPayment, onPaid]);

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
      {/* Once the deposit is seen there's nothing left to scan — drop the QR. */}
      {!detected && (
        <QrCode
          data={uri}
          link={uri}
          width={512}
          height={512}
          avatar="/logo.jpg"
          className="cursor-pointer rounded-sm overflow-hidden"
        />
      )}
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
        <div className="flex flex-col items-center gap-1.5 rounded-sm border border-cyber-primary/40 bg-cyber-primary/10 px-3 py-2 text-center text-xs text-cyber-primary">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyber-primary" />
            <FormattedMessage defaultMessage="Payment received — waiting for confirmation. You can safely leave this page." />
          </div>
          {creditedDays !== undefined && (
            <div className="text-cyber-text">
              <FormattedMessage
                defaultMessage="Credits {days, plural, one {# day} other {# days}} at the rate when the deposit was seen — pro-rated by the amount received."
                values={{ days: creditedDays }}
              />
            </div>
          )}
          {txid && (
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono break-all underline decoration-dotted underline-offset-2 hover:text-cyber-text-bright"
            >
              <FormattedMessage defaultMessage="View transaction" />{" ↗"}
            </a>
          )}
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
