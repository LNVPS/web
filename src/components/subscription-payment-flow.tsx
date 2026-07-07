import { useCallback, useEffect, useState } from "react";
import {
  AccountDetail,
  PaymentMethod,
  SubscriptionPayment,
  VmPayment,
} from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { AsyncButton } from "./button";
import { CostAmount } from "./cost";
import QrCode from "./qr";
import { RevolutPayWidget } from "./revolut";
import type { Mode } from "@revolut/checkout";
import { FormattedMessage, useIntl } from "react-intl";

interface SubscriptionPaymentFlowProps {
  subscriptionId: number;
  onPaymentComplete: () => void;
  onCancel?: () => void;
}

// Map a SubscriptionPayment onto the VmPayment shape consumed by the
// Revolut widget (which expects flat numeric amounts).
function toVmPayment(payment: SubscriptionPayment): VmPayment {
  return {
    id: payment.id,
    vm_id: 0,
    created: payment.created,
    expires: payment.expires,
    amount: payment.amount.amount,
    tax: payment.tax.amount,
    processing_fee: payment.processing_fee.amount,
    currency: payment.amount.currency,
    is_paid: payment.is_paid,
    paid_at: payment.paid_at,
    data: payment.data,
    time: 0,
    payment_method: payment.payment_method,
  };
}

export default function SubscriptionPaymentFlow({
  subscriptionId,
  onPaymentComplete,
  onCancel,
}: SubscriptionPaymentFlowProps) {
  const login = useLogin();
  const { formatNumber } = useIntl();
  const { data: cachedMethods, loading: methodsLoading } = usePaymentMethods();
  const [payment, setPayment] = useState<SubscriptionPayment>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [account, setAccount] = useState<AccountDetail>();

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .getAccount()
      .then(setAccount)
      .catch((e) => console.error("Failed to load account info:", e));
  }, [login?.api]);

  const handlePaymentComplete = useCallback(() => {
    setPayment(undefined);
    onPaymentComplete();
  }, [onPaymentComplete]);

  // Reliable payment detection for every method: poll the subscription's
  // payments until the created payment is marked paid. (The generic
  // /payment/{id} status endpoint only resolves VPS subscriptions.)
  useEffect(() => {
    if (!login?.api || !payment) return;
    const tx = setInterval(async () => {
      try {
        const list = await login.api.listSubscriptionPayments(subscriptionId);
        const match = list.find((p) => p.id === payment.id);
        if (match?.is_paid) {
          clearInterval(tx);
          handlePaymentComplete();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2_000);
    return () => clearInterval(tx);
  }, [login?.api, payment, subscriptionId, handlePaymentComplete]);

  const createPayment = useCallback(
    async function (methodName: string) {
      if (!login?.api) return;
      setLoading(true);
      setError(undefined);
      try {
        const result = await login.api.renewSubscription(
          subscriptionId,
          methodName,
        );
        setPayment(result);
      } catch (e) {
        if (e instanceof Error) setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [login?.api, subscriptionId],
  );

  function renderProcessingFee(m: PaymentMethod) {
    if (!m.processing_fee_rate && !m.processing_fee_base) return null;
    const rate = m.processing_fee_rate;
    const base = m.processing_fee_base;
    const currency = m.processing_fee_currency?.toUpperCase();
    const feeParts: Array<string> = [];
    if (rate) {
      feeParts.push(
        formatNumber(rate / 100, {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      );
    }
    if (base) {
      if (currency === "BTC") {
        feeParts.push(`${formatNumber(Math.floor(base / 1000))} sats`);
      } else {
        feeParts.push(
          formatNumber(base / 100, { style: "currency", currency: currency! }),
        );
      }
    }
    return (
      <div className="text-xs text-cyber-muted bg-cyber-panel p-1 rounded">
        <FormattedMessage
          defaultMessage="Fee: {fees}"
          values={{ fees: feeParts.join(" + ") }}
        />
      </div>
    );
  }

  function renderPaymentMethod(method: PaymentMethod) {
    // No LNURL renewal endpoint exists for subscriptions.
    if (method.name === "lnurl") return null;
    // Hide NWC unless the account has a connection string configured.
    if (
      method.name === "nwc" &&
      (!account?.nwc_connection_string ||
        account.nwc_connection_string.trim() === "")
    ) {
      return null;
    }

    const label =
      method.name === "revolut" ? (
        <FormattedMessage defaultMessage="Pay with Card" />
      ) : method.name === "nwc" ? (
        <FormattedMessage defaultMessage="Pay Now" />
      ) : (
        <FormattedMessage defaultMessage="Get Invoice" />
      );

    return (
      <div
        key={method.name}
        className="flex items-center justify-between px-3 py-2 bg-cyber-panel rounded-sm"
      >
        <div>
          <div>
            {method.name.toUpperCase()} ({method.currencies.join(",")})
          </div>
          {renderProcessingFee(method)}
        </div>
        <AsyncButton
          className="rounded-sm p-2 bg-cyber-primary/20 text-sm"
          disabled={loading}
          onClick={() => createPayment(method.name)}
        >
          {label}
        </AsyncButton>
      </div>
    );
  }

  if (methodsLoading) {
    return (
      <div className="text-center py-8 text-cyber-muted">
        <FormattedMessage defaultMessage="Loading payment methods..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-cyber-danger/20 text-cyber-danger p-4 rounded-sm">
          <strong>
            <FormattedMessage defaultMessage="Error:" />
          </strong>{" "}
          {error}
        </div>
        <div className="flex gap-2">
          <AsyncButton onClick={() => setError(undefined)}>
            <FormattedMessage defaultMessage="Retry" />
          </AsyncButton>
          {onCancel && (
            <AsyncButton onClick={onCancel}>
              <FormattedMessage defaultMessage="Cancel" />
            </AsyncButton>
          )}
        </div>
      </div>
    );
  }

  if (payment) {
    return (
      <div className="space-y-4">
        {"lightning" in payment.data ? (
          <SubscriptionLightningPayment payment={payment} />
        ) : "revolut" in payment.data ? (
          <RevolutPayWidget
            mode={import.meta.env.VITE_REVOLUT_MODE as Mode | undefined}
            payment={toVmPayment(payment)}
            account={account}
            onPaid={handlePaymentComplete}
          />
        ) : (
          <div className="bg-cyber-panel-light p-4 rounded-sm space-y-2 text-center">
            <div className="text-lg font-bold">
              <CostAmount
                cost={{
                  currency: payment.amount.currency,
                  amount: payment.amount.amount + payment.tax.amount,
                }}
                converted={false}
              />
            </div>
            <div className="text-sm text-cyber-muted">
              <FormattedMessage defaultMessage="Complete your payment using the selected payment method. Your subscription will activate automatically after confirmation." />
            </div>
          </div>
        )}
        <div className="flex justify-center">
          <AsyncButton onClick={() => setPayment(undefined)}>
            <FormattedMessage defaultMessage="Cancel Payment" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">
        <FormattedMessage defaultMessage="Select Payment Method" />
      </div>
      <div className="space-y-2">
        {cachedMethods?.map((method) => renderPaymentMethod(method))}
      </div>
      {onCancel && (
        <div className="flex justify-center pt-4">
          <AsyncButton onClick={onCancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </AsyncButton>
        </div>
      )}
    </div>
  );
}

function SubscriptionLightningPayment({
  payment,
}: {
  payment: SubscriptionPayment;
}) {
  if (!("lightning" in payment.data)) return null;
  const invoice = payment.data.lightning;
  const ln = `lightning:${invoice}`;
  const total = payment.amount.amount + payment.tax.amount;
  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-3 bg-cyber-panel items-center">
      <QrCode
        data={ln}
        link={ln}
        width={512}
        height={512}
        avatar="/logo.jpg"
        className="cursor-pointer rounded-sm overflow-hidden"
      />
      <div className="flex flex-col items-center">
        <div className="text-cyber-primary">
          <CostAmount
            cost={{ currency: payment.amount.currency, amount: total }}
            converted={false}
          />
        </div>
        {payment.tax.amount > 0 && (
          <div className="text-xs text-cyber-muted">
            <FormattedMessage
              defaultMessage="including {amount} tax"
              values={{
                amount: (
                  <CostAmount
                    cost={{
                      currency: payment.tax.currency,
                      amount: payment.tax.amount,
                    }}
                    converted={false}
                  />
                ),
              }}
            />
          </div>
        )}
        {payment.processing_fee.amount > 0 && (
          <div className="text-xs text-cyber-muted">
            <FormattedMessage
              defaultMessage="including {amount} processing fee"
              values={{
                amount: (
                  <CostAmount
                    cost={{
                      currency: payment.processing_fee.currency,
                      amount: payment.processing_fee.amount,
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
