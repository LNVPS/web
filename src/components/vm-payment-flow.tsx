import { useState, useCallback, useEffect, useRef } from "react";
import {
  PaymentMethod,
  VmInstance,
  VmPayment,
  VmUpgradeRequest,
  AccountDetail,
} from "../api";
import VpsPayment from "./vps-payment";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { AsyncButton } from "./button";
import { CostAmount, IntervalSuffix } from "./cost";
import { RevolutPayWidget } from "./revolut";
import { Icon } from "./icon";
import { ApiUrl } from "../const";
import QrCode from "./qr";
import { LNURL } from "@snort/shared";
import { FormattedMessage, useIntl } from "react-intl";

export type PaymentFlowType = "renewal" | "upgrade";

interface VmPaymentFlowProps {
  vm: VmInstance;
  type: PaymentFlowType;
  upgradeRequest?: VmUpgradeRequest; // Required only for upgrade type
  paymentMethod?: string; // Optional preselected payment method
  onPaymentComplete: () => void;
  onCancel?: () => void;
}

export default function VmPaymentFlow({
  vm,
  type,
  upgradeRequest,
  paymentMethod,
  onPaymentComplete,
  onCancel,
}: VmPaymentFlowProps) {
  const login = useLogin();
  const { formatNumber } = useIntl();
  const { data: cachedMethods, loading: methodsLoading } = usePaymentMethods();
  const [methods, setMethods] = useState<Array<PaymentMethod>>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>();
  const [payment, setPayment] = useState<VmPayment>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [account, setAccount] = useState<AccountDetail>();
  const [intervals, setIntervals] = useState(1);
  const intervalsRef = useRef(intervals);
  intervalsRef.current = intervals;

  const loadAccountInfo = useCallback(
    async function () {
      if (login?.api) {
        try {
          const accountData = await login.api.getAccount();
          setAccount(accountData);
        } catch (e) {
          console.error("Failed to load account info:", e);
        }
      }
    },
    [login?.api],
  );

  const loadPaymentMethods = useCallback(
    async function () {
      // Use cached methods if available, otherwise trigger reload
      if ((cachedMethods?.length ?? 0) > 0) {
        setMethods(cachedMethods);
      }
    },
    [cachedMethods],
  );

  const createPayment = useCallback(
    async function (methodName: string) {
      if (!login?.api) return;

      setLoading(true);
      setError(undefined);

      try {
        let paymentResult: VmPayment;

        if (type === "renewal") {
          paymentResult = await login.api.renewVm(
            vm.id,
            methodName,
            intervalsRef.current,
          );
        } else if (type === "upgrade") {
          if (!upgradeRequest) {
            throw new Error("Upgrade request is required for upgrade payments");
          }
          paymentResult = await login.api.createVmUpgradePayment(
            vm.id,
            upgradeRequest,
            methodName,
          );
        } else {
          throw new Error("Invalid payment type");
        }

        setPayment(paymentResult);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [login?.api, vm.id, type, upgradeRequest],
  );

  const handlePaymentComplete = useCallback(() => {
    setPayment(undefined);
    setSelectedMethod(undefined);
    setMethods(undefined);
    onPaymentComplete();
  }, [onPaymentComplete]);

  useEffect(() => {
    loadPaymentMethods();
    loadAccountInfo();
  }, [loadPaymentMethods, loadAccountInfo]);

  // Auto-create payment for preselected payment method
  useEffect(() => {
    if (paymentMethod && !payment && !loading) {
      createPayment(paymentMethod);
    }
  }, [paymentMethod, payment, loading, createPayment]);

  function renderPaymentMethod(method: PaymentMethod) {
    // Filter out NWC method when user has no NWC connection configured
    if (
      method.name === "nwc" &&
      (!account?.nwc_connection_string ||
        account.nwc_connection_string.trim() === "")
    ) {
      return null;
    }

    const className =
      "flex items-center justify-between px-3 py-2 bg-cyber-panel rounded-sm cursor-pointer hover:bg-cyber-panel-light";

    const nameRow = (m: PaymentMethod) => (
      <div>
        {m.name.toUpperCase()} ({m.currencies.join(",")})
      </div>
    );

    const renderProcessingFee = (m: PaymentMethod) => {
      if (m.processing_fee_rate || m.processing_fee_base) {
        const rate = m.processing_fee_rate;
        const base = m.processing_fee_base;
        const currency = m.processing_fee_currency?.toUpperCase();

        const feeParts = [];
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
              formatNumber(base / 100, {
                style: "currency",
                currency: currency!,
              }),
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
      return null;
    };

    switch (method.name) {
      case "nwc": {
        return (
          <div key={method.name} className={className}>
            <div>
              {nameRow(method)}
              {renderProcessingFee(method)}
            </div>
            <AsyncButton
              className="rounded-sm p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
                await createPayment(method.name);
              }}
            >
              <FormattedMessage defaultMessage="Pay Now" />
            </AsyncButton>
          </div>
        );
      }
      case "lnurl": {
        return (
          <div key={method.name} className={className}>
            <div>
              {nameRow(method)}
              {renderProcessingFee(method)}
            </div>
            <AsyncButton
              className="rounded-sm p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
              }}
            >
              <FormattedMessage defaultMessage="Show QR" />
            </AsyncButton>
          </div>
        );
      }
      case "lightning": {
        return (
          <div key={method.name} className={className}>
            <div>
              {nameRow(method)}
              {renderProcessingFee(method)}
            </div>
            <AsyncButton
              className="rounded-sm p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
                await createPayment(method.name);
              }}
            >
              <FormattedMessage defaultMessage="Get Invoice" />
            </AsyncButton>
          </div>
        );
      }
      case "revolut": {
        return (
          <div key={method.name} className={className}>
            <div>
              {nameRow(method)}
              {renderProcessingFee(method)}
            </div>
            <AsyncButton
              className="rounded-sm p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
                await createPayment(method.name);
              }}
            >
              <FormattedMessage defaultMessage="Pay with Card" />
            </AsyncButton>
          </div>
        );
      }
    }
  }

  if (methodsLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-cyber-muted">
          <FormattedMessage defaultMessage="Loading payment methods..." />
        </div>
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
          <AsyncButton onClick={loadPaymentMethods}>
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

  // Show payment processing for Lightning payments
  if (payment) {
    return (
      <div className="space-y-4">
        <div className="text-xl font-bold">
          {type === "renewal" ? (
            <FormattedMessage defaultMessage="Renew VPS" />
          ) : (
            <FormattedMessage defaultMessage="Upgrade Payment" />
          )}
        </div>

        {"lightning" in payment.data ? (
          <VpsPayment payment={payment} onPaid={handlePaymentComplete} />
        ) : "revolut" in payment.data ? (
          <RevolutPayWidget
            mode={import.meta.env.VITE_REVOLUT_MODE}
            payment={payment}
            account={account}
            onPaid={handlePaymentComplete}
          />
        ) : (
          <div className="bg-cyber-panel-light p-4 rounded-sm space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-bold">
                <CostAmount
                  cost={{
                    currency: payment.currency,
                    amount: payment.amount + payment.tax,
                  }}
                  converted={false}
                />
              </div>
              <div className="text-sm text-cyber-muted">
                <FormattedMessage defaultMessage="Total Amount" />
              </div>
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

            <div className="text-sm text-cyber-muted text-center">
              <FormattedMessage defaultMessage="Complete your payment using the selected payment method. Changes will be applied automatically after confirmation." />
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <AsyncButton
            onClick={() => {
              setPayment(undefined);
              setSelectedMethod(undefined);
            }}
          >
            <FormattedMessage defaultMessage="Cancel Payment" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  // Show NWC payment interface
  if (selectedMethod?.name === "lnurl") {
    const lud16 = `${vm.id}@${new URL(ApiUrl).host}`;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMethod(undefined)}
            className="text-cyber-accent hover:text-cyber-accent"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <div className="text-xl font-bold">
            <FormattedMessage defaultMessage="LNURL Payment" />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-sm p-3 bg-cyber-panel items-center">
          <QrCode
            data={`lightning:${new LNURL(lud16).lnurl}`}
            width={512}
            height={512}
            avatar="/logo.jpg"
            className="cursor-pointer rounded-sm overflow-hidden"
          />
          <div className="monospace select-all break-all text-center text-sm">
            {lud16}
          </div>
        </div>
      </div>
    );
  }

  // Skip payment method selection if payment method is preselected
  if (paymentMethod) {
    return (
      <div className="space-y-4">
        <div className="text-xl font-bold">
          {type === "renewal" ? (
            <FormattedMessage defaultMessage="Processing Renewal Payment" />
          ) : (
            <FormattedMessage defaultMessage="Processing Upgrade Payment" />
          )}
        </div>
        <div className="text-center py-8">
          <div className="text-cyber-muted">
            {loading ? (
              <FormattedMessage defaultMessage="Creating payment..." />
            ) : (
              <FormattedMessage defaultMessage="Loading payment details..." />
            )}
          </div>
        </div>
        {onCancel && (
          <div className="flex justify-center">
            <AsyncButton onClick={onCancel}>
              <FormattedMessage defaultMessage="Cancel" />
            </AsyncButton>
          </div>
        )}
      </div>
    );
  }

  // Show payment method selection for renewals or when no method is preselected
  if (!methods && !methodsLoading) {
    return (
      <div className="space-y-4">
        <AsyncButton onClick={loadPaymentMethods} disabled={loading}>
          {loading ? (
            <FormattedMessage defaultMessage="Loading..." />
          ) : type === "renewal" ? (
            <FormattedMessage defaultMessage="Extend Now" />
          ) : (
            <FormattedMessage defaultMessage="Upgrade Now" />
          )}
        </AsyncButton>
        {onCancel && (
          <AsyncButton onClick={onCancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </AsyncButton>
        )}
      </div>
    );
  }

  const intervalType = vm.template.cost_plan.interval_type;

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">
        <FormattedMessage defaultMessage="Select Payment Method" />
      </div>

      {type === "renewal" &&
        (() => {
          const steps = intervalType === "day" ? [1, 7, 14, 30] : [1, 3, 6, 12];
          const stepIndex = steps.indexOf(intervals);
          const currentIndex = stepIndex >= 0 ? stepIndex : 0;
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-cyber-muted text-sm">
                  <FormattedMessage defaultMessage="Renew for:" />
                </span>
                <span className="text-sm">
                  {intervals}{" "}
                  <IntervalSuffix interval={intervalType} n={intervals} />
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                step={1}
                value={currentIndex}
                onChange={(e) => setIntervals(steps[e.target.valueAsNumber])}
              />
              <div className="flex justify-between text-xs text-cyber-muted">
                {steps.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          );
        })()}

      <div className="space-y-2">
        {methods?.map((method) => renderPaymentMethod(method))}
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
