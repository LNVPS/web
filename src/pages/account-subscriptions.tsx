import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Subscription } from "../api";
import useLogin from "../hooks/login";
import { CostAmount } from "../components/cost";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import classNames from "classnames";
import { FormattedDate, FormattedMessage } from "react-intl";

function monthlyTotal(sub: Subscription) {
  // Line item prices share the subscription currency.
  const currency = sub.line_items[0]?.price.currency ?? "USD";
  const amount = sub.line_items.reduce((acc, li) => acc + li.price.amount, 0);
  return { currency, amount };
}

export function AccountSubscriptionsPage() {
  const login = useLogin();
  const [subscriptions, setSubscriptions] = useState<Array<Subscription>>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .listSubscriptions()
      .then((r) => setSubscriptions(r))
      .catch((e) => {
        if (e instanceof Error) setError(e.message);
      });
  }, [login?.api]);

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <div className="text-xl">
        <FormattedMessage defaultMessage="Subscriptions" />
      </div>
      {error && <b className="text-cyber-danger">{error}</b>}
      {subscriptions === undefined && !error && (
        <div className="flex justify-center py-8">
          <Spinner width={24} height={24} />
        </div>
      )}
      {subscriptions && subscriptions.length === 0 && (
        <div className="text-cyber-muted">
          <FormattedMessage defaultMessage="You don't have any subscriptions yet." />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {subscriptions?.map((sub) => {
          const total = monthlyTotal(sub);
          return (
            <Link
              key={sub.id}
              to={`/account/subscriptions/${sub.id}`}
              className="flex justify-between items-center rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 hover:border-cyber-primary transition-all duration-200"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>{sub.name || `#${sub.id}`}</span>
                  <span
                    className={classNames(
                      "text-xs px-2 py-0.5 rounded-sm",
                      sub.is_active
                        ? "bg-cyber-primary/20 text-cyber-primary"
                        : "bg-cyber-panel-light text-cyber-muted",
                    )}
                  >
                    {sub.is_active ? (
                      <FormattedMessage defaultMessage="Active" />
                    ) : (
                      <FormattedMessage defaultMessage="Pending payment" />
                    )}
                  </span>
                </div>
                {sub.expires && (
                  <span className="text-xs text-cyber-muted">
                    <FormattedMessage
                      defaultMessage="Renews {date}"
                      values={{
                        date: (
                          <FormattedDate
                            value={sub.expires}
                            year="numeric"
                            month="short"
                            day="numeric"
                          />
                        ),
                      }}
                    />
                  </span>
                )}
              </div>
              <div className="text-cyber-accent">
                <CostAmount
                  cost={{ ...total, interval_type: "month" }}
                  converted={false}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
