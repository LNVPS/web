import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvailableIpSpace, IpSpacePricing, Subscription } from "../../api";
import useLogin from "../../hooks/login";
import { AsyncButton } from "../../components/button";
import CostLabel from "../../components/cost";
import SubscriptionPaymentFlow from "../../components/subscription-payment-flow";
import { FormattedMessage } from "react-intl";

export interface IpSpaceCartItem {
  ipBlock?: AvailableIpSpace;
  pricing?: IpSpacePricing;
}

export default function OrderIpSpacePage({
  items,
}: {
  items: Array<IpSpaceCartItem>;
}) {
  const login = useLogin();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [subscription, setSubscription] = useState<Subscription>();
  const [orderError, setOrderError] = useState("");

  const lineItems = items.filter((i) => i.ipBlock && i.pricing);

  async function createOrder() {
    if (!login?.api || lineItems.length === 0) return;
    setOrderError("");
    try {
      const sub = await login.api.createSubscription({
        name: name.trim() || undefined,
        currency: login.currency,
        line_items: lineItems.map((i) => ({
          type: "ip_range",
          ip_space_pricing_id: i.pricing!.id,
        })),
      });
      setSubscription(sub);
    } catch (e) {
      if (e instanceof Error) setOrderError(e.message);
    }
  }

  if (lineItems.length === 0) {
    return (
      <h3>
        <FormattedMessage defaultMessage="No order found" />
      </h3>
    );
  }

  if (subscription) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xl">
          <FormattedMessage defaultMessage="Complete Payment" />
        </div>
        <div className="text-cyber-muted text-sm">
          <FormattedMessage defaultMessage="Your IP space subscription has been created. Complete the first payment to allocate the address space and activate the subscription." />
        </div>
        <SubscriptionPaymentFlow
          subscriptionId={subscription.id}
          onPaymentComplete={() =>
            navigate(`/account/subscriptions/${subscription.id}`)
          }
          onCancel={() =>
            navigate(`/account/subscriptions/${subscription.id}`)
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="New IP Space Order" />
      </div>
      <div className="flex flex-col gap-2">
        {lineItems.map((i, idx) => {
          const block = i.ipBlock!;
          const price = i.pricing!;
          return (
            <div
              key={`${block.id}_${price.id}_${idx}`}
              className="flex justify-between items-center rounded-sm bg-cyber-panel px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="text-cyber-primary">
                  {block.registry.toUpperCase()}{" "}
                  {block.ip_version === "ipv6" ? "IPv6" : "IPv4"} /
                  {price.prefix_size}
                </div>
                {price.setup_fee.amount !== 0 && (
                  <div className="text-cyber-muted text-sm">
                    <FormattedMessage defaultMessage="Setup fee:" />{" "}
                    <CostLabel
                      cost={{
                        ...price.setup_fee,
                        other_price: price.other_setup_fee,
                      }}
                    />
                  </div>
                )}
              </div>
              <CostLabel
                cost={{
                  interval_type: "month",
                  ...price.price,
                  other_price: price.other_price,
                }}
              />
            </div>
          );
        })}
      </div>
      <hr />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Subscription name (optional)" />
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My IP block"
        />
      </label>
      <AsyncButton onClick={createOrder}>
        <FormattedMessage defaultMessage="Create Order" />
      </AsyncButton>
      {orderError && <b className="text-cyber-danger">{orderError}</b>}
    </div>
  );
}
