import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Subscription,
  SubscriptionLineItem,
  SubscriptionPayment,
} from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { CostAmount } from "../components/cost";
import SubscriptionPaymentFlow from "../components/subscription-payment-flow";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { FormattedDate, FormattedMessage } from "react-intl";

function ResourceBadge({ item }: { item: SubscriptionLineItem }) {
  if (!item.resource) return null;
  if (item.resource.type === "vps") {
    return (
      <span className="text-xs text-cyber-muted">
        <FormattedMessage
          defaultMessage="VM #{id}"
          values={{ id: item.resource.vm_id }}
        />
      </span>
    );
  }
  return (
    <span className="text-xs text-cyber-muted">
      <FormattedMessage
        defaultMessage="IP range #{id}"
        values={{ id: item.resource.ip_range_subscription_id }}
      />
    </span>
  );
}

export function AccountSubscriptionPage() {
  const login = useLogin();
  const params = useParams();
  const id = Number(params["id"]);
  const [subscription, setSubscription] = useState<Subscription>();
  const [payments, setPayments] = useState<Array<SubscriptionPayment>>([]);
  const [error, setError] = useState<string>();
  const [showPayment, setShowPayment] = useState(false);

  const reload = useCallback(async () => {
    if (!login?.api || !Number.isFinite(id)) return;
    try {
      const [sub, pay] = await Promise.all([
        login.api.getSubscription(id),
        login.api.listSubscriptionPayments(id),
      ]);
      setSubscription(sub);
      setPayments(pay);
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
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <div className="flex justify-between items-center">
        <div className="text-xl">
          {subscription.name || `#${subscription.id}`}
        </div>
        <span
          className={
            subscription.is_active
              ? "text-xs px-2 py-0.5 rounded-sm bg-cyber-primary/20 text-cyber-primary"
              : "text-xs px-2 py-0.5 rounded-sm bg-cyber-panel-light text-cyber-muted"
          }
        >
          {subscription.is_active ? (
            <FormattedMessage defaultMessage="Active" />
          ) : (
            <FormattedMessage defaultMessage="Pending payment" />
          )}
        </span>
      </div>

      {subscription.description && (
        <div className="text-cyber-muted text-sm">
          {subscription.description}
        </div>
      )}

      {subscription.expires && (
        <div className="text-sm">
          <FormattedMessage
            defaultMessage="Renews: {date}"
            values={{
              date: (
                <FormattedDate
                  value={subscription.expires}
                  year="numeric"
                  month="short"
                  day="numeric"
                />
              ),
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-lg">
          <FormattedMessage defaultMessage="Line Items" />
        </div>
        {subscription.line_items.map((li) => (
          <div
            key={li.id}
            className="flex justify-between items-center rounded-sm bg-cyber-panel px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <div>{li.name}</div>
              <ResourceBadge item={li} />
            </div>
            <div className="text-cyber-accent">
              <CostAmount
                cost={{ ...li.price, interval_type: "month" }}
                converted={false}
              />
            </div>
          </div>
        ))}
      </div>

      {showPayment ? (
        <SubscriptionPaymentFlow
          subscriptionId={subscription.id}
          onPaymentComplete={onPaymentComplete}
          onCancel={() => setShowPayment(false)}
        />
      ) : (
        <AsyncButton onClick={() => setShowPayment(true)}>
          {subscription.is_active ? (
            <FormattedMessage defaultMessage="Renew Now" />
          ) : (
            <FormattedMessage defaultMessage="Pay Now" />
          )}
        </AsyncButton>
      )}

      {!showPayment && (
        <>
          <div className="text-lg">
            <FormattedMessage defaultMessage="Payment History" />
          </div>
          {payments.length === 0 ? (
            <div className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="No payments yet." />
            </div>
          ) : (
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
                    <FormattedMessage defaultMessage="Type" />
                  </th>
                  <th>
                    <FormattedMessage defaultMessage="Method" />
                  </th>
                  <th>
                    <FormattedMessage defaultMessage="Status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .sort(
                    (a, b) =>
                      new Date(b.created).getTime() -
                      new Date(a.created).getTime(),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="pl-4">
                        <FormattedDate
                          value={p.created}
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
                            currency: p.amount.currency,
                            amount:
                              p.amount.amount +
                              p.tax.amount +
                              p.processing_fee.amount,
                          }}
                          converted={false}
                        />
                      </td>
                      <td className="text-sm">{p.payment_type}</td>
                      <td className="uppercase text-sm">{p.payment_method}</td>
                      <td>
                        {p.is_paid ? (
                          <FormattedMessage defaultMessage="Paid" />
                        ) : new Date(p.expires) <= new Date() ? (
                          <FormattedMessage defaultMessage="Expired" />
                        ) : (
                          <FormattedMessage defaultMessage="Unpaid" />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
