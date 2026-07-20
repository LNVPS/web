import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  SavedPaymentMethod,
  Subscription,
  SubscriptionLineItem,
  SubscriptionPayment,
  VmPayment,
} from "../api";
import useLogin from "../hooks/login";
import { CostAmount } from "../components/cost";
import { Card, CardBody, CardTitle } from "../components/card";
import { Icon } from "../components/icon";
import PaymentFlow from "../components/payment-flow";
import {
  subscriptionRenewalSource,
  subscriptionToVmPayment,
} from "../components/payment-sources";
import {
  AutoRenewCard,
  BillingPaymentsTable,
  BillingStatusCard,
  expiryStatus,
  type PaymentRow,
} from "../components/billing";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { FormattedMessage, useIntl } from "react-intl";

function ResourceBadge({ item }: { item: SubscriptionLineItem }) {
  if (!item.resource) return null;
  return (
    <span className="inline-flex w-fit items-center rounded-sm border border-cyber-border bg-cyber-panel-light px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-cyber-muted">
      {item.resource.type === "vps" ? (
        <FormattedMessage
          defaultMessage="VM #{id}"
          values={{ id: item.resource.vm_id }}
        />
      ) : (
        <FormattedMessage
          defaultMessage="IP range #{id}"
          values={{ id: item.resource.ip_range_subscription_id }}
        />
      )}
    </span>
  );
}

export function AccountSubscriptionPage() {
  const login = useLogin();
  const params = useParams();
  const { formatDate } = useIntl();
  const id = Number(params["id"]);
  const [subscription, setSubscription] = useState<Subscription>();
  const [payments, setPayments] = useState<Array<SubscriptionPayment>>([]);
  const [savedMethods, setSavedMethods] = useState<Array<SavedPaymentMethod>>(
    [],
  );
  const [error, setError] = useState<string>();
  const [showPayment, setShowPayment] = useState(false);
  // An unpaid payment being resumed: reopens the flow at the QR/widget stage.
  const [resumePayment, setResumePayment] = useState<VmPayment>();
  const [renewSaving, setRenewSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!login?.api || !Number.isFinite(id)) return;
    try {
      const [sub, pay] = await Promise.all([
        login.api.getSubscription(id),
        login.api.listSubscriptionPayments(id),
      ]);
      setSubscription(sub);
      setPayments(pay);
      login.api
        .listPaymentMethods()
        .then((pms) => setSavedMethods(pms.filter((x) => x.enabled)))
        .catch(() => {});
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }, [login?.api, id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (error) return <b className="text-cyber-danger">{error}</b>;
  if (!subscription) {
    return (
      <div className="flex justify-center py-8">
        <Spinner width={24} height={24} />
      </div>
    );
  }

  async function onPaymentComplete() {
    setShowPayment(false);
    setResumePayment(undefined);
    await reload();
  }

  const currency = subscription.line_items[0]?.price.currency ?? "EUR";
  const totalAmount = subscription.line_items.reduce(
    (sum, li) => sum + li.price.amount,
    0,
  );
  const expires = subscription.expires
    ? new Date(subscription.expires)
    : undefined;
  // Subscriptions bill monthly, so scale the lease meter against a 30-day cycle.
  const st = expiryStatus(subscription.expires, 30);
  const pending = !subscription.is_active;
  const tone = pending && !st.expired ? "warning" : st.tone;
  const defaultMethod =
    savedMethods.find((m) => m.is_default && m.enabled) ??
    savedMethods.find((m) => m.is_default);

  const paymentRows: Array<PaymentRow> = payments.map((p) => ({
    id: p.id,
    created: p.created,
    amount: {
      currency: p.amount.currency,
      amount: p.amount.amount + p.tax.amount + p.processing_fee.amount,
    },
    method:
      p.payment_method ??
      ("lightning" in p.data
        ? "lightning"
        : "revolut" in p.data
          ? "revolut"
          : "onchain" in p.data
            ? "onchain"
            : "—"),
    // On-chain deposits are never rejected — late payments still credit
    // pro-rata — so a pending on-chain payment is "awaiting", not expired.
    status: p.is_paid ? (
      <FormattedMessage defaultMessage="Paid" />
    ) : "onchain" in p.data ? (
      <FormattedMessage defaultMessage="Pending" />
    ) : new Date(p.expires) <= new Date() ? (
      <FormattedMessage defaultMessage="Expired" />
    ) : (
      <FormattedMessage defaultMessage="Unpaid" />
    ),
    statusTone: p.is_paid
      ? "primary"
      : "onchain" in p.data || new Date(p.expires) > new Date()
        ? "warning"
        : "danger",
    action: p.is_paid ? (
      <div
        title="Generate invoice"
        className="cursor-pointer"
        onClick={async () => {
          const l = await login?.api.invoiceLink(p.id);
          if (l) window.open(l, "_blank");
        }}
      >
        <Icon name="printer" />
      </div>
    ) : "onchain" in p.data ||
      ("lightning" in p.data && new Date(p.expires) > new Date()) ? (
      // Unpaid but still payable (on-chain deposits are never rejected;
      // Lightning invoices until they expire): reopen at the QR stage.
      <div
        title="Resume payment"
        className="cursor-pointer"
        onClick={() => {
          setResumePayment(subscriptionToVmPayment(p));
          setShowPayment(true);
        }}
      >
        <Icon name="qr" />
      </div>
    ) : undefined,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />

      <Link
        to="/account/subscriptions"
        className="w-fit text-sm text-cyber-muted hover:text-cyber-text transition-all"
      >
        &lt; <FormattedMessage defaultMessage="Back to subscriptions" />
      </Link>

      {showPayment && login?.api ? (
        <PaymentFlow
          title={
            subscription.is_active ? (
              <FormattedMessage defaultMessage="Renew subscription" />
            ) : (
              <FormattedMessage defaultMessage="Pay subscription" />
            )
          }
          source={subscriptionRenewalSource(login.api, subscription.id)}
          initialPayment={resumePayment}
          onPaymentComplete={onPaymentComplete}
          onCancel={() => {
            setShowPayment(false);
            setResumePayment(undefined);
            // A payment may have been created and left pending (e.g. an
            // on-chain deposit awaiting confirmation) — refresh so it shows
            // in the payment history right away.
            reload();
          }}
        />
      ) : (
        <>
          <BillingStatusCard
            eyebrow={
              <>
                <FormattedMessage defaultMessage="Subscription" /> ·{" "}
                {subscription.name || `#${subscription.id}`}
              </>
            }
            statusLabel={
              pending ? (
                <FormattedMessage defaultMessage="Pending payment" />
              ) : st.expired ? (
                <FormattedMessage defaultMessage="Expired" />
              ) : st.expiringSoon ? (
                <FormattedMessage defaultMessage="Expiring soon" />
              ) : (
                <FormattedMessage defaultMessage="Active" />
              )
            }
            tone={tone}
            priceLabel={<FormattedMessage defaultMessage="Renews at" />}
            price={
              <>
                <CostAmount
                  cost={{ currency, amount: totalAmount, interval_type: "month" }}
                  converted={false}
                />
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
              expires
                ? formatDate(expires, {
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
            meterRight={<FormattedMessage defaultMessage="Billed monthly" />}
            cta={{
              onClick: () => setShowPayment(true),
              label: pending ? (
                <FormattedMessage defaultMessage="Pay now" />
              ) : st.expired ? (
                <FormattedMessage defaultMessage="Reactivate now" />
              ) : (
                <FormattedMessage defaultMessage="Renew now" />
              ),
            }}
          />

          <AutoRenewCard
            enabled={subscription.auto_renewal_enabled}
            defaultMethod={defaultMethod}
            saving={renewSaving}
            onToggle={async () => {
              if (!login?.api) return;
              setError(undefined);
              setRenewSaving(true);
              try {
                const updated = await login.api.patchSubscription(
                  subscription.id,
                  { auto_renewal_enabled: !subscription.auto_renewal_enabled },
                );
                setSubscription(updated);
              } catch (e) {
                if (e instanceof Error) setError(e.message);
              } finally {
                setRenewSaving(false);
              }
            }}
            description={
              subscription.auto_renewal_enabled ? (
                <FormattedMessage defaultMessage="Renews automatically one day before expiry using your default payment method." />
              ) : (
                <FormattedMessage defaultMessage="Automatic renewal is off. Renew manually before expiry to avoid interruption." />
              )
            }
          />

          {subscription.description && (
            <div className="text-cyber-muted text-sm">
              {subscription.description}
            </div>
          )}

          <Card>
            <CardTitle>
              <FormattedMessage defaultMessage="Line items" />
            </CardTitle>
            <CardBody className="p-0">
              <div className="divide-y divide-cyber-border/60">
                {subscription.line_items.map((li) => (
                  <div
                    key={li.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-cyber-text-bright">{li.name}</span>
                      {li.description && (
                        <span className="text-xs text-cyber-muted">
                          {li.description}
                        </span>
                      )}
                      <ResourceBadge item={li} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end tabular-nums">
                      <span className="text-cyber-accent">
                        <CostAmount
                          cost={{ ...li.price, interval_type: "month" }}
                          converted={false}
                        />
                      </span>
                      {li.setup_fee.amount > 0 && (
                        <span className="text-xs text-cyber-muted">
                          <FormattedMessage
                            defaultMessage="+ {fee} setup"
                            values={{
                              fee: (
                                <CostAmount
                                  cost={li.setup_fee}
                                  converted={false}
                                />
                              ),
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-cyber-border bg-cyber-panel-light px-4 py-3">
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                  <FormattedMessage defaultMessage="Monthly total" />
                </span>
                <span className="text-cyber-text-bright tabular-nums">
                  <CostAmount
                    cost={{ currency, amount: totalAmount, interval_type: "month" }}
                    converted={false}
                  />
                  <span className="text-xs text-cyber-muted">
                    {" "}
                    <FormattedMessage defaultMessage="ex. tax" />
                  </span>
                </span>
              </div>
            </CardBody>
          </Card>

          <BillingPaymentsTable rows={paymentRows} hasAction />
        </>
      )}
    </div>
  );
}
