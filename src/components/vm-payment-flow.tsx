import { useState, useCallback, useEffect } from "react";
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
import { CostAmount } from "./cost";
import { RevolutPayWidget } from "./revolut";
import { Icon } from "./icon";
import { ApiUrl } from "../const";
import QrCode from "./qr";
import { LNURL } from "@snort/shared";

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
  const { data: cachedMethods, loading: methodsLoading } = usePaymentMethods();
  const [methods, setMethods] = useState<Array<PaymentMethod>>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>();
  const [payment, setPayment] = useState<VmPayment>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [account, setAccount] = useState<AccountDetail>();

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
          paymentResult = await login.api.renewVm(vm.id, methodName);
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

  // Auto-create payment for preselected payment method (used for upgrades, except revolut)
  useEffect(() => {
    if (paymentMethod && paymentMethod !== "revolut" && !payment && !loading) {
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
      "flex items-center justify-between px-3 py-2 bg-cyber-panel rounded cursor-pointer hover:bg-cyber-panel-light";

    const nameRow = (m: PaymentMethod) => (
      <div>
        {m.name.toUpperCase()} ({m.currencies.join(",")})
      </div>
    );

    switch (method.name) {
      case "lnurl": {
        const addr = method.metadata?.["address"];
        return (
          <div
            key={method.name}
            className={className}
            onClick={() => setSelectedMethod(method)}
          >
            {nameRow(method)}
            <div className="text-sm text-cyber-muted">{addr}</div>
          </div>
        );
      }
      case "lightning": {
        return (
          <div key={method.name} className={className}>
            {nameRow(method)}
            <AsyncButton
              className="rounded p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
                await createPayment(method.name);
              }}
            >
              Get Invoice
            </AsyncButton>
          </div>
        );
      }
      case "nwc": {
        return (
          <div key={method.name} className={className}>
            {nameRow(method)}
            <AsyncButton
              className="rounded p-2 bg-cyber-primary/20 text-sm"
              onClick={async () => {
                setSelectedMethod(method);
                await createPayment(method.name);
              }}
            >
              Pay with NWC
            </AsyncButton>
          </div>
        );
      }
      case "revolut": {
        const pkey = method.metadata?.["pubkey"];
        if (!pkey)
          return (
            <div key={method.name} className="text-cyber-danger">
              Missing Revolut pubkey
            </div>
          );

        return (
          <div key={method.name} className="bg-cyber-panel rounded p-3">
            {nameRow(method)}
            <RevolutPayWidget
              mode={import.meta.env.VITE_REVOLUT_MODE}
              pubkey={pkey}
              amount={
                type === "renewal"
                  ? vm.template.cost_plan
                  : {
                      amount: upgradeRequest ? 0 : 0, // This would need proper calculation
                      currency: "EUR", // Default, should be dynamic
                    }
              }
              onPaid={handlePaymentComplete}
              loadOrder={async () => {
                if (!login?.api) {
                  throw new Error("Not logged in");
                }
                await createPayment(method.name);
                return payment && "revolut" in payment.data
                  ? payment.data.revolut.token
                  : "";
              }}
            />
          </div>
        );
      }
      default:
        return (
          <div
            key={method.name}
            className={className}
            onClick={() => {
              setSelectedMethod(method);
              createPayment(method.name);
            }}
          >
            {nameRow(method)}
            <div className="rounded p-2 bg-cyber-accent/20 text-sm">
              Pay Now
            </div>
          </div>
        );
    }
  }

  // Create LNURL payment method for renewals only
  const lnurlMethod: PaymentMethod | null =
    type === "renewal"
      ? {
          name: "lnurl",
          currencies: ["BTC"],
          metadata: {
            address: `${vm.id}@${new URL(ApiUrl).host}`,
          },
        }
      : null;

  if (methodsLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-cyber-muted">Loading payment methods...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-cyber-danger/20 text-cyber-danger p-4 rounded">
          <strong>Error:</strong> {error}
        </div>
        <div className="flex gap-2">
          <AsyncButton onClick={loadPaymentMethods}>Retry</AsyncButton>
          {onCancel && <AsyncButton onClick={onCancel}>Cancel</AsyncButton>}
        </div>
      </div>
    );
  }

  // Show payment processing for Lightning payments
  if (payment) {
    return (
      <div className="space-y-4">
        <div className="text-xl font-bold">
          {type === "renewal" ? "Renew VPS" : "Upgrade Payment"}
        </div>

        {"lightning" in payment.data ? (
          <VpsPayment payment={payment} onPaid={handlePaymentComplete} />
        ) : "revolut" in payment.data ? (
          <div className="bg-cyber-panel-light p-4 rounded space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-bold">
                <CostAmount
                  cost={{
                    currency: payment.currency,
                    amount:
                      payment.currency === "BTC"
                        ? (payment.amount + payment.tax) / 1000
                        : (payment.amount + payment.tax) / 100,
                  }}
                  converted={false}
                />
              </div>
              <div className="text-sm text-cyber-muted">Total Amount</div>
            </div>

            {(() => {
              const revolutMethod = methods?.find((m) => m.name === "revolut");
              const pkey = revolutMethod?.metadata?.["pubkey"];

              if (!pkey) {
                return (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Revolut Payment</div>
                    <div className="bg-cyber-panel p-3 rounded">
                      <div className="text-sm">
                        Payment Token: {payment.data.revolut.token}
                      </div>
                      <div className="text-xs text-cyber-muted mt-1">
                        Use this token with your Revolut payment method
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <RevolutPayWidget
                  mode={import.meta.env.VITE_REVOLUT_MODE}
                  pubkey={pkey}
                  amount={{
                    currency: payment.currency,
                    amount:
                      payment.currency === "BTC"
                        ? (payment.amount + payment.tax) / 1000
                        : (payment.amount + payment.tax) / 100,
                  }}
                  onPaid={handlePaymentComplete}
                  loadOrder={async () =>
                    "revolut" in payment.data ? payment.data.revolut.token : ""
                  }
                />
              );
            })()}
          </div>
        ) : (
          <div className="bg-cyber-panel-light p-4 rounded space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-bold">
                <CostAmount
                  cost={{
                    currency: payment.currency,
                    amount:
                      payment.currency === "BTC"
                        ? (payment.amount + payment.tax) / 1000
                        : (payment.amount + payment.tax) / 100,
                  }}
                  converted={false}
                />
              </div>
              <div className="text-sm text-cyber-muted">Total Amount</div>
            </div>

            <div className="text-sm text-cyber-muted text-center">
              Complete your payment using the selected payment method. Changes
              will be applied automatically after confirmation.
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
            Cancel Payment
          </AsyncButton>
        </div>
      </div>
    );
  }

  // Show LNURL payment interface
  if (selectedMethod?.name === "lnurl" && lnurlMethod) {
    const lud16 = lnurlMethod.metadata?.address || "";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMethod(undefined)}
            className="text-cyber-accent hover:text-cyber-accent"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <div className="text-xl font-bold">LNURL Payment</div>
        </div>

        <div className="flex flex-col gap-4 rounded p-3 bg-cyber-panel items-center">
          <QrCode
            data={`lightning:${new LNURL(lud16).lnurl}`}
            width={512}
            height={512}
            avatar="/logo.jpg"
            className="cursor-pointer rounded overflow-hidden"
          />
          <div className="monospace select-all break-all text-center text-sm">
            {lud16}
          </div>
        </div>
      </div>
    );
  }

  // Skip payment method selection if payment method is preselected (but show RevolutPayWidget for revolut)
  if (paymentMethod && paymentMethod !== "revolut") {
    return (
      <div className="space-y-4">
        <div className="text-xl font-bold">
          {type === "renewal"
            ? "Processing Renewal Payment"
            : "Processing Upgrade Payment"}
        </div>
        <div className="text-center py-8">
          <div className="text-cyber-muted">
            {loading ? "Creating payment..." : "Loading payment details..."}
          </div>
        </div>
        {onCancel && (
          <div className="flex justify-center">
            <AsyncButton onClick={onCancel}>Cancel</AsyncButton>
          </div>
        )}
      </div>
    );
  }

  // Handle preselected revolut payment method
  if (paymentMethod === "revolut") {
    const revolutMethod = methods?.find((m) => m.name === "revolut");
    if (!revolutMethod) {
      return (
        <div className="space-y-4">
          <div className="text-xl font-bold">Revolut Payment</div>
          <div className="text-center py-8">
            <div className="text-cyber-danger">
              Revolut payment method not available
            </div>
          </div>
          {onCancel && (
            <div className="flex justify-center">
              <AsyncButton onClick={onCancel}>Cancel</AsyncButton>
            </div>
          )}
        </div>
      );
    }

    const pkey = revolutMethod.metadata?.["pubkey"];
    if (!pkey) {
      return (
        <div className="space-y-4">
          <div className="text-xl font-bold">Revolut Payment</div>
          <div className="text-center py-8">
            <div className="text-cyber-danger">
              Missing Revolut configuration
            </div>
          </div>
          {onCancel && (
            <div className="flex justify-center">
              <AsyncButton onClick={onCancel}>Cancel</AsyncButton>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-cyber-accent hover:text-cyber-accent"
            >
              <Icon name="arrow-left" size={20} />
            </button>
          )}
          <div className="text-xl font-bold">Revolut Payment</div>
        </div>

        <div className="bg-cyber-panel rounded p-4">
          <RevolutPayWidget
            mode={import.meta.env.VITE_REVOLUT_MODE}
            pubkey={pkey}
            amount={
              type === "renewal"
                ? vm.template.cost_plan
                : {
                    amount: 0, // Will be determined by the widget
                    currency: "EUR", // Default, should be dynamic
                  }
            }
            onPaid={handlePaymentComplete}
            loadOrder={async () => {
              if (!login?.api) {
                throw new Error("Not logged in");
              }

              let paymentResult: VmPayment;
              if (type === "renewal") {
                paymentResult = await login.api.renewVm(vm.id, "revolut");
              } else if (type === "upgrade") {
                if (!upgradeRequest) {
                  throw new Error(
                    "Upgrade request is required for upgrade payments",
                  );
                }
                paymentResult = await login.api.createVmUpgradePayment(
                  vm.id,
                  upgradeRequest,
                  "revolut",
                );
              } else {
                throw new Error("Invalid payment type");
              }

              return "revolut" in paymentResult.data
                ? paymentResult.data.revolut.token
                : "";
            }}
          />
        </div>
      </div>
    );
  }

  // Show payment method selection for renewals or when no method is preselected
  if (!methods && !methodsLoading) {
    return (
      <div className="space-y-4">
        <AsyncButton onClick={loadPaymentMethods} disabled={loading}>
          {loading
            ? "Loading..."
            : `${type === "renewal" ? "Extend" : "Upgrade"} Now`}
        </AsyncButton>
        {onCancel && <AsyncButton onClick={onCancel}>Cancel</AsyncButton>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">Select Payment Method</div>

      <div className="space-y-2">
        {lnurlMethod && renderPaymentMethod(lnurlMethod)}
        {methods?.map((method) => renderPaymentMethod(method))}
      </div>

      {onCancel && (
        <div className="flex justify-center pt-4">
          <AsyncButton onClick={onCancel}>Cancel</AsyncButton>
        </div>
      )}
    </div>
  );
}
