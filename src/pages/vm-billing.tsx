import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  VmCostPlan,
  VmInstance,
  VmPayment,
  CostPlanIntervalType,
  SavedPaymentMethod,
} from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import CostLabel, { IntervalSuffix } from "../components/cost";
import PaymentFlow from "../components/payment-flow";
import {
  vmRenewalSource,
  resolveVmSubscriptionId,
} from "../components/payment-sources";
import {
  AutoRenewCard,
  BillingPaymentsTable,
  BillingStatusCard,
  DeletionWarning,
  expiryStatus,
  type PaymentRow,
} from "../components/billing";
import { Icon } from "../components/icon";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { showError } from "../toast";

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
  const [renewSaving, setRenewSaving] = useState(false);
  const [savedMethods, setSavedMethods] = useState<Array<SavedPaymentMethod>>(
    [],
  );

  async function listPayments() {
    if (!state) return;
    const history = await login?.api.listPayments(state.id);
    setPayments(history ?? []);
  }

  async function loadSavedMethods() {
    if (!login?.api) return;
    try {
      setSavedMethods((await login.api.listPaymentMethods()) ?? []);
    } catch {
      // non-fatal: the auto-renew card just won't show a method
    }
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

  async function toggleRenew() {
    if (!login?.api || !state) return;
    setRenewSaving(true);
    try {
      const newEnabled = !state.auto_renewal_enabled;
      await login.api.patchVm(state.id, { auto_renewal_enabled: newEnabled });
      setState((prev) =>
        prev ? { ...prev, auto_renewal_enabled: newEnabled } : prev,
      );
    } catch (error) {
      showError(error);
    } finally {
      setRenewSaving(false);
    }
  }

  useEffect(() => {
    if (params["action"] === "renew" && login && state) {
      setShowPaymentFlow(true);
    }
    if (login && state) {
      listPayments();
      loadSavedMethods();
    }
  }, [login, state, params]);

  if (!state) return;
  const plan = state.template.cost_plan;
  const expireDate = state.expires ? new Date(state.expires) : undefined;
  const deletingOn = state.deleting_on
    ? new Date(state.deleting_on)
    : undefined;
  const defaultMethod =
    savedMethods.find((m) => m.is_default && m.enabled) ??
    savedMethods.find((m) => m.is_default);
  const st = expiryStatus(state.expires, planCycleDays(plan));

  const paymentRows: Array<PaymentRow> = payments.map((a) => ({
    id: a.id,
    created: a.created,
    amount: {
      currency: a.currency,
      amount: a.amount + a.tax + a.processing_fee,
    },
    method:
      a.payment_method ??
      ("lightning" in a.data
        ? "lightning"
        : "revolut" in a.data
          ? "revolut"
          : "—"),
    status: a.is_paid ? (
      <FormattedMessage defaultMessage="Paid" />
    ) : new Date(a.expires) <= new Date() ? (
      <FormattedMessage defaultMessage="Expired" />
    ) : (
      <FormattedMessage defaultMessage="Unpaid" />
    ),
    statusTone: a.is_paid
      ? "primary"
      : new Date(a.expires) <= new Date()
        ? "danger"
        : "warning",
    action: a.is_paid ? (
      <div
        title="Generate Invoice"
        className="cursor-pointer"
        onClick={async () => {
          const l = await login?.api.invoiceLink(a.id);
          window.open(l, "_blank");
        }}
      >
        <Icon name="printer" />
      </div>
    ) : undefined,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      {!showPaymentFlow && (
        <div className="flex flex-col gap-4">
          <BillingStatusCard
            eyebrow={
              <>
                <FormattedMessage defaultMessage="Subscription" /> · VPS #
                {state.id}
              </>
            }
            statusLabel={
              st.isNew ? (
                <FormattedMessage defaultMessage="Not active" />
              ) : st.expired ? (
                <FormattedMessage defaultMessage="Expired" />
              ) : st.expiringSoon ? (
                <FormattedMessage defaultMessage="Expiring soon" />
              ) : (
                <FormattedMessage defaultMessage="Active" />
              )
            }
            tone={st.tone}
            priceLabel={<FormattedMessage defaultMessage="Renews at" />}
            price={
              <>
                <CostLabel cost={plan} />
                <span className="text-xs text-cyber-muted">
                  <FormattedMessage defaultMessage="ex. tax" />
                </span>
              </>
            }
            dateLabel={
              st.expired ? (
                <FormattedMessage defaultMessage="Expired on" />
              ) : (
                <FormattedMessage defaultMessage="Next payment" />
              )
            }
            date={
              expireDate
                ? formatDate(expireDate, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"
            }
            meterPct={st.meterPct}
            meterLeft={
              st.isNew ? (
                <FormattedMessage defaultMessage="Not yet active" />
              ) : st.expired ? (
                <FormattedMessage defaultMessage="Lease expired" />
              ) : (
                <FormattedMessage
                  defaultMessage="{days, plural, one {# day left} other {# days left}}"
                  values={{ days: st.daysLeft }}
                />
              )
            }
            meterRight={
              <>
                <FormattedMessage defaultMessage="Billed every" />{" "}
                {plan.interval_amount > 1 && <>{plan.interval_amount} </>}
                <IntervalSuffix
                  interval={plan.interval_type}
                  n={plan.interval_amount}
                />
              </>
            }
            warning={
              st.expired && deletingOn ? (
                <DeletionWarning deletingOn={deletingOn} />
              ) : undefined
            }
            cta={{
              onClick: () => setShowPaymentFlow(true),
              disabled: methodsLoading,
              label: methodsLoading ? (
                <FormattedMessage defaultMessage="Loading…" />
              ) : st.isNew ? (
                <FormattedMessage defaultMessage="Pay now" />
              ) : st.expired ? (
                <FormattedMessage defaultMessage="Reactivate now" />
              ) : (
                <FormattedMessage defaultMessage="Extend now" />
              ),
            }}
          />

          <AutoRenewCard
            enabled={state.auto_renewal_enabled ?? false}
            saving={renewSaving}
            onToggle={toggleRenew}
            defaultMethod={defaultMethod}
            description={
              state.auto_renewal_enabled ? (
                <FormattedMessage defaultMessage="Renews automatically one day before expiry using your default payment method." />
              ) : (
                <FormattedMessage defaultMessage="Turn on to charge your default payment method automatically one day before expiry." />
              )
            }
          />
        </div>
      )}

      {showPaymentFlow && login?.api && (
        <RenewalFlow
          vm={state}
          onPaymentComplete={onPaymentComplete}
          onCancel={() => setShowPaymentFlow(false)}
        />
      )}

      {!showPaymentFlow && (
        <BillingPaymentsTable rows={paymentRows} hasAction />
      )}
    </div>
  );
}

/** Length of one billing cycle in days, used to scale the expiry meter. */
function planCycleDays(plan: VmCostPlan): number {
  const n = plan.interval_amount || 1;
  switch (plan.interval_type) {
    case CostPlanIntervalType.DAY:
      return n;
    case CostPlanIntervalType.MONTH:
      return n * 30;
    case CostPlanIntervalType.YEAR:
      return n * 365;
    default:
      return 30;
  }
}

/** Renew a VM via its underlying subscription. */
function RenewalFlow({
  vm,
  onPaymentComplete,
  onCancel,
}: {
  vm: VmInstance;
  onPaymentComplete: () => void;
  onCancel: () => void;
}) {
  const login = useLogin();
  const [subscriptionId, setSubscriptionId] = useState<number>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!login?.api) return;
    let active = true;
    resolveVmSubscriptionId(login.api, vm)
      .then((id) => {
        if (!active) return;
        if (id === undefined) setError(true);
        else setSubscriptionId(id);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [login?.api, vm]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-cyber-danger text-sm">
          <FormattedMessage defaultMessage="Couldn't find a subscription to renew for this VM." />
        </div>
        <button
          onClick={onCancel}
          className="self-start text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
        >
          <FormattedMessage defaultMessage="Cancel" />
        </button>
      </div>
    );
  }

  if (!login?.api || subscriptionId === undefined) {
    return (
      <div className="py-8 text-center text-cyber-muted">
        <FormattedMessage defaultMessage="Loading renewal…" />
      </div>
    );
  }

  return (
    <PaymentFlow
      title={
        <FormattedMessage defaultMessage="Renew VPS #{id}" values={{ id: vm.id }} />
      }
      source={vmRenewalSource(login.api, vm, subscriptionId)}
      onPaymentComplete={onPaymentComplete}
      onCancel={onCancel}
    />
  );
}
