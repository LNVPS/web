import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { VmInstance, VmPayment } from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { AsyncButton } from "../components/button";
import CostLabel, { CostAmount } from "../components/cost";
import VmPaymentFlow from "../components/vm-payment-flow";
import { TimeValue } from "../components/time-value";
import { Icon } from "../components/icon";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";

export function VmBillingPage() {
  const location = useLocation() as { state?: VmInstance };
  const params = useParams();
  const login = useLogin();
  const { formatDate } = useIntl();
  const navigate = useNavigate();
  const { loading: methodsLoading } = usePaymentMethods();
  const [payments, setPayments] = useState<Array<VmPayment>>([]);
  const [state, setState] = useState<VmInstance | undefined>(location?.state);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

  async function listPayments() {
    if (!state) return;
    const history = await login?.api.listPayments(state.id);
    setPayments(history ?? []);
  }

  async function reloadVmState() {
    if (!state) return;
    const newState = await login?.api.getVm(state.id);
    setState(newState);
    return newState;
  }

  async function onPaymentComplete() {
    setShowPaymentFlow(false);
    const newState = await reloadVmState();
    if (params["action"] === "renew") {
      navigate("/vm", { state: newState });
    }
  }

  useEffect(() => {
    if (params["action"] === "renew" && login && state) {
      setShowPaymentFlow(true);
    }
    if (login && state) {
      listPayments();
    }
  }, [login, state, params]);

  if (!state) return;
  const expireDate = state.expires ? new Date(state.expires) : undefined;
  const days = expireDate
    ? (expireDate.getTime() - new Date().getTime()) / 1000 / 24 / 60 / 60
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <div className="text-xl bg-cyber-panel rounded-sm px-3 py-4 flex justify-between items-center">
        <div>
          <FormattedMessage
            defaultMessage="Renewal for #{id}"
            values={{ id: state.id }}
          />
        </div>
        <div>
          <CostLabel cost={state.template.cost_plan} />
          <span className="text-sm">
            {" "}
            <FormattedMessage defaultMessage="ex. tax" />
          </span>
        </div>
      </div>
      {expireDate && days !== undefined && days > 0 && (
        <div>
          <FormattedMessage
            defaultMessage="Expires: {date} ({days} days)"
            values={{
              date: formatDate(expireDate, {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              days: Math.floor(days),
            }}
          />
        </div>
      )}
      {(days === undefined || days < 0) && !showPaymentFlow && (
        <div className="text-cyber-danger text-xl">
          <FormattedMessage defaultMessage="Expired" />
        </div>
      )}
      {!showPaymentFlow && (
        <div className="flex gap-4 flex-wrap">
          <AsyncButton
            onClick={() => setShowPaymentFlow(true)}
            disabled={methodsLoading}
          >
            {methodsLoading ? (
              <FormattedMessage defaultMessage="Loading..." />
            ) : (
              <FormattedMessage defaultMessage="Extend Now" />
            )}
          </AsyncButton>
          <AsyncButton
            onClick={async () => {
              if (!login?.api) return;
              try {
                const newEnabled = !state.auto_renewal_enabled;
                await login.api.patchVm(state.id, {
                  auto_renewal_enabled: newEnabled,
                });
                setState((prev) =>
                  prev ? { ...prev, auto_renewal_enabled: newEnabled } : prev,
                );
              } catch (error) {
                console.error("Failed to update auto-renewal:", error);
              }
            }}
          >
            {state.auto_renewal_enabled ? (
              <FormattedMessage defaultMessage="Disable Auto-Renewal" />
            ) : (
              <FormattedMessage defaultMessage="Enable Auto-Renewal" />
            )}
          </AsyncButton>
        </div>
      )}

      {!showPaymentFlow && state.auto_renewal_enabled && (
        <div className="bg-cyber-primary/10 border border-cyber-primary/30 rounded-sm p-3">
          <div className="text-cyber-primary text-sm font-medium">
            <FormattedMessage defaultMessage="Auto-renewal enabled" />
          </div>
          <p className="text-cyber-muted text-sm mt-1">
            <FormattedMessage defaultMessage="This VM will automatically renew 1 day before expiration using your configured Nostr Wallet Connect connection." />
          </p>
        </div>
      )}

      {!showPaymentFlow && !state.auto_renewal_enabled && (
        <div className="bg-cyber-panel/50 border border-cyber-border rounded-sm p-3">
          <div className="text-cyber-muted text-sm font-medium">
            <FormattedMessage defaultMessage="Auto-renewal disabled" />
          </div>
          <p className="text-cyber-muted text-sm mt-1">
            <FormattedMessage defaultMessage="Configure an NWC connection string in account settings, then enable auto-renewal to automatically pay for VM renewals." />
          </p>
        </div>
      )}

      {showPaymentFlow && (
        <VmPaymentFlow
          vm={state}
          type="renewal"
          onPaymentComplete={onPaymentComplete}
          onCancel={() => setShowPaymentFlow(false)}
        />
      )}

      {!showPaymentFlow && (
        <>
          <div className="text-xl">
            <FormattedMessage defaultMessage="Payment History" />
          </div>
          <table className="table bg-cyber-panel rounded-sm text-center">
            <thead>
              <tr>
                <th>
                  <FormattedMessage defaultMessage="Date" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Amount" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Method" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Time" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Status" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments
                .sort(
                  (a, b) =>
                    new Date(b.created).getTime() -
                    new Date(a.created).getTime(),
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td className="pl-4">
                      <FormattedDate
                        value={a.created}
                        year="numeric"
                        month="short"
                        day="numeric"
                        hour="2-digit"
                        minute="2-digit"
                      />
                    </td>
                    <td>
                      <CostAmount
                        cost={{
                          amount: a.amount + a.tax + a.processing_fee,
                          currency: a.currency,
                        }}
                        converted={false}
                      />
                      {a.tax > 0 && (
                        <span className="text-cyber-muted text-xs">
                          {" "}
                          (
                          <CostAmount
                            cost={{ amount: a.tax, currency: a.currency }}
                            converted={false}
                          />{" "}
                          <FormattedMessage defaultMessage="tax" />)
                        </span>
                      )}
                      {a.processing_fee > 0 && (
                        <span className="text-cyber-muted text-xs">
                          {" "}
                          (
                          <CostAmount
                            cost={{
                              amount: a.processing_fee,
                              currency: a.currency,
                            }}
                            converted={false}
                          />{" "}
                          <FormattedMessage defaultMessage="fee" />)
                        </span>
                      )}
                    </td>
                    <td className="uppercase text-sm">
                      {a.payment_method ??
                        ("lightning" in a.data
                          ? "lightning"
                          : "revolut" in a.data
                            ? "revolut"
                            : "—")}
                    </td>
                    <td>
                      <TimeValue seconds={a.time} />
                    </td>
                    <td>
                      {a.is_paid ? (
                        <FormattedMessage defaultMessage="Paid" />
                      ) : new Date(a.expires) <= new Date() ? (
                        <FormattedMessage defaultMessage="Expired" />
                      ) : (
                        <FormattedMessage defaultMessage="Unpaid" />
                      )}
                    </td>
                    <td>
                      {a.is_paid && (
                        <div
                          title="Generate Invoice"
                          onClick={async () => {
                            const l = await login?.api.invoiceLink(a.id);
                            window.open(l, "_blank");
                          }}
                        >
                          <Icon name="printer" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
