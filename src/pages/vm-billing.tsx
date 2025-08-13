import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { VmInstance, VmPayment } from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { AsyncButton } from "../components/button";
import CostLabel, { CostAmount } from "../components/cost";
import VmPaymentFlow from "../components/vm-payment-flow";
import { timeValue } from "../utils";
import { Icon } from "../components/icon";

export function VmBillingPage() {
  const location = useLocation() as { state?: VmInstance };
  const params = useParams();
  const login = useLogin();
  const navigate = useNavigate();
  const { data: paymentMethods, loading: methodsLoading } = usePaymentMethods();
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
  const expireDate = new Date(state.expires);
  const days =
    (expireDate.getTime() - new Date().getTime()) / 1000 / 24 / 60 / 60;

  return (
    <div className="flex flex-col gap-4">
      <Link to={"/vm"} state={state}>
        &lt; Back
      </Link>
      <div className="text-xl bg-neutral-900 rounded-xl px-3 py-4 flex justify-between items-center">
        <div>Renewal for #{state.id}</div>
        <div>
          <CostLabel cost={state.template.cost_plan} />
          <span className="text-sm">ex. tax</span>
        </div>
      </div>
      {days > 0 && (
        <div>
          Expires: {expireDate.toDateString()} ({Math.floor(days)} days)
        </div>
      )}
      {days < 0 && !showPaymentFlow && (
        <div className="text-red-500 text-xl">Expired</div>
      )}
      {!showPaymentFlow && (
        <div className="flex gap-4 flex-wrap">
          <AsyncButton
            onClick={() => setShowPaymentFlow(true)}
            disabled={methodsLoading}
          >
            {methodsLoading ? 'Loading...' : 'Extend Now'}
          </AsyncButton>
          <AsyncButton
            onClick={async () => {
              if (!login?.api) return;
              try {
                const newEnabled = !state.auto_renewal_enabled;
                await login.api.patchVm(state.id, {
                  auto_renewal_enabled: newEnabled,
                });
                setState((prev) => prev ? { ...prev, auto_renewal_enabled: newEnabled } : prev);
              } catch (error) {
                console.error('Failed to update auto-renewal:', error);
              }
            }}
          >
            {state.auto_renewal_enabled ? 'Disable' : 'Enable'} Auto-Renewal
          </AsyncButton>
        </div>
      )}

      {!showPaymentFlow && state.auto_renewal_enabled && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <div className="text-green-400 text-sm font-medium">🔄 Auto-renewal enabled</div>
          <p className="text-neutral-400 text-sm mt-1">
            This VM will automatically renew 1 day before expiration using your configured Nostr Wallet Connect connection.
          </p>
        </div>
      )}

      {!showPaymentFlow && !state.auto_renewal_enabled && (
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-lg p-3">
          <div className="text-neutral-400 text-sm font-medium">Auto-renewal disabled</div>
          <p className="text-neutral-400 text-sm mt-1">
            Configure an NWC connection string in account settings, then enable auto-renewal to automatically pay for VM renewals.
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
          <div className="text-xl">Payment History</div>
          <table className="table bg-neutral-900 rounded-xl text-center">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Status</th>
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
                      {new Date(a.created).toLocaleString()}
                    </td>
                    <td>
                      <CostAmount
                        cost={{
                          amount:
                            (a.amount + a.tax) /
                            (a.currency === "BTC" ? 1e11 : 100),
                          currency: a.currency,
                        }}
                        converted={false}
                      />
                    </td>
                    <td>{timeValue(a.time)}</td>
                    <td>
                      {a.is_paid
                        ? "Paid"
                        : new Date(a.expires) <= new Date()
                          ? "Expired"
                          : "Unpaid"}
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
