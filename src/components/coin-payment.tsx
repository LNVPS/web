import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { VmPayment } from "../api";
import QrCode from "./qr";
import { CostAmount } from "./cost";
import { AsyncButton } from "./button";
import { coinTicker } from "../utils/currency";
import { depositOutpoint } from "../utils/deposit";

const POLL_MS = 5_000;

/**
 * A coin paid through a FixedFloat swap: shows the deposit address and the
 * amount of the coin to send, then polls until the swapped Bitcoin settles.
 * Time is pro-rated by the Bitcoin that arrives, so a short or late deposit
 * buys proportionally less rather than being lost.
 */
export default function CoinPayment({
  payment,
  pollPaid,
  pollDetected,
  onPaid,
  onDone,
}: {
  payment: VmPayment;
  pollPaid: (paymentId: string) => Promise<boolean>;
  pollDetected?: (paymentId: string) => Promise<VmPayment | undefined>;
  onPaid?: () => void;
  onDone?: () => void;
}) {
  const [seen, setSeen] = useState<VmPayment | undefined>(
    depositOutpoint(payment.data) ? payment : undefined,
  );

  useEffect(() => {
    const tx = setInterval(async () => {
      try {
        if (await pollPaid(payment.id)) {
          clearInterval(tx);
          onPaid?.();
          return;
        }
        if (!seen && pollDetected) {
          const detected = await pollDetected(payment.id);
          if (detected) setSeen(detected);
        }
      } catch (e) {
        console.error(e);
      }
    }, POLL_MS);
    return () => clearInterval(tx);
  }, [payment.id, pollPaid, pollDetected, seen, onPaid]);

  if (!("fixedfloat" in payment.data)) {
    return (
      <div className="text-cyber-danger">
        <FormattedMessage defaultMessage="This component only supports coin payments" />
      </div>
    );
  }

  const { coin, address, amount } = payment.data.fixedfloat;
  const outpoint = seen ? depositOutpoint(seen.data) : undefined;
  const ticker = coinTicker(coin);
  const totalMsats = payment.amount + payment.tax + payment.processing_fee;
  const txid = outpoint?.split(":")[0];

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-3 bg-cyber-panel items-center">
      {!outpoint && (
        <QrCode
          data={address}
          width={512}
          height={512}
          className="rounded-sm overflow-hidden"
        />
      )}
      <div className="flex flex-col items-center gap-1">
        <div className="text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Send exactly" />
        </div>
        <div className="monospace select-all text-lg text-cyber-primary">
          {amount} {ticker}
        </div>
        <div className="text-xs text-cyber-muted">
          <FormattedMessage
            defaultMessage="worth {amount}"
            values={{
              amount: (
                <CostAmount
                  cost={{ currency: payment.currency, amount: totalMsats }}
                  converted={false}
                />
              ),
            }}
          />
        </div>
      </div>
      <div className="monospace select-all break-all text-center text-sm text-cyber-text">
        {address}
      </div>
      {outpoint ? (
        <div className="flex flex-col items-center gap-1.5 rounded-sm border border-cyber-primary/40 bg-cyber-primary/10 px-3 py-2 text-center text-xs text-cyber-primary">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyber-primary" />
            <FormattedMessage defaultMessage="Swap complete, waiting for the Bitcoin to confirm. You can safely leave this page." />
          </div>
          {txid && (
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono break-all underline decoration-dotted underline-offset-2 hover:text-cyber-text-bright"
            >
              <FormattedMessage defaultMessage="View transaction" />
              {" ↗"}
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-center text-xs text-cyber-muted">
          <FormattedMessage
            defaultMessage="Send {ticker} to this address within 15 minutes. It is swapped to Bitcoin and your time is credited once that confirms, pro-rated by the Bitcoin received."
            values={{ ticker }}
          />
          <FormattedMessage
            defaultMessage="Send only {ticker} on the right network. Anything else is lost."
            values={{ ticker }}
          />
        </div>
      )}
      <div className="text-center text-xs text-cyber-muted">
        <FormattedMessage defaultMessage="The exchange service is provided by FixedFloat. Creating an order confirms your agreement with the rules of FixedFloat." />{" "}
        <a
          href="https://ff.io/terms-of-service"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2"
        >
          ff.io/terms-of-service ↗
        </a>
      </div>
      {onDone && (
        <div className="flex w-full flex-col items-center gap-2">
          <AsyncButton
            onClick={onDone}
            className="w-full justify-center bg-cyber-primary/20"
          >
            <FormattedMessage defaultMessage="I've sent the payment" />
          </AsyncButton>
          <div className="text-center text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="You can safely leave this page. The payment appears in your billing history and is applied once it confirms." />
          </div>
        </div>
      )}
    </div>
  );
}
