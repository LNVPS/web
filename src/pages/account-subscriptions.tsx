import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Subscription } from "../api";
import useLogin from "../hooks/login";
import { CostAmount } from "../components/cost";
import {
  expiryStatus,
  StatusPill,
  subscriptionStatus,
} from "../components/billing";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { FormattedDate, FormattedMessage } from "react-intl";

type Category = "active" | "pending" | "expired";

function categorize(sub: Subscription): Category {
  if (expiryStatus(sub.expires, 30).expired) return "expired";
  if (!sub.is_active) return "pending";
  return "active";
}

function monthlyTotal(sub: Subscription) {
  // Line item prices share the subscription currency.
  const currency = sub.line_items[0]?.price.currency ?? "USD";
  const amount = sub.line_items.reduce((acc, li) => acc + li.price.amount, 0);
  return { currency, amount };
}

/** Human summary of what a subscription bills for, from its line-item names.
 * A subscription is a generic basket of services, so we list what's in it rather
 * than assuming any particular resource type. */
function itemsLabel(sub: Subscription): ReactNode {
  const names = sub.line_items
    .map((li) => li.name?.trim())
    .filter((n): n is string => !!n);
  if (names.length === 0) {
    return (
      <FormattedMessage
        defaultMessage="{n, plural, one {# item} other {# items}}"
        values={{ n: sub.line_items.length }}
      />
    );
  }
  const shown = names.slice(0, 2).join(" · ");
  const extra = names.length - 2;
  return extra > 0 ? `${shown} +${extra}` : shown;
}

/** One subscription row. */
function SubscriptionRow({ sub }: { sub: Subscription }) {
  const total = monthlyTotal(sub);
  const status = subscriptionStatus(sub);
  return (
    <Link
      to={`/account/subscriptions/${sub.id}`}
      className="group flex items-stretch gap-4 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-cyber-text-bright font-medium truncate">
            {sub.name || `#${sub.id}`}
          </span>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cyber-muted">
          <span className="truncate">{itemsLabel(sub)}</span>
          {sub.expires && (
            <>
              <span className="text-cyber-border" aria-hidden>
                ·
              </span>
              <span className="whitespace-nowrap">
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
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center shrink-0">
        <span className="text-cyber-text-bright tabular-nums">
          <CostAmount
            cost={{ ...total, interval_type: "month" }}
            converted={false}
          />
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-cyber-muted">
          <FormattedMessage defaultMessage="per month" />
        </span>
      </div>
      <span className="self-center text-cyber-muted group-hover:text-cyber-primary transition-colors">
        &rsaquo;
      </span>
    </Link>
  );
}

/** A titled group of subscriptions; secondary groups can be collapsed. */
function Group({
  title,
  subs,
  collapsible,
  defaultOpen,
}: {
  title: ReactNode;
  subs: Array<Subscription>;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  if (subs.length === 0) return null;
  const header = (
    <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-cyber-muted">
      {collapsible && (
        <span className="text-cyber-border" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      )}
      <span>{title}</span>
      <span className="text-cyber-border">({subs.length})</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-fit items-center gap-2 py-1"
        >
          {header}
        </button>
      ) : (
        header
      )}
      {open &&
        subs.map((sub) => <SubscriptionRow key={sub.id} sub={sub} />)}
    </div>
  );
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
      <div>
        <h1 className="m-0 text-2xl text-cyber-primary">
          <FormattedMessage defaultMessage="Subscriptions" />
        </h1>
        <p className="mt-1 text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Recurring plans that keep your services active." />
        </p>
      </div>

      {error && <b className="text-cyber-danger">{error}</b>}

      {subscriptions === undefined && !error && (
        <div className="flex justify-center py-8">
          <Spinner width={24} height={24} />
        </div>
      )}

      {subscriptions && subscriptions.length === 0 && (
        <div className="rounded-sm border border-dashed border-cyber-border bg-cyber-panel/40 px-4 py-10 text-center text-cyber-muted">
          <FormattedMessage defaultMessage="You don't have any subscriptions yet." />
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (() => {
        const active = subscriptions
          .filter((s) => categorize(s) === "active")
          .sort(
            (a, b) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        const pending = subscriptions
          .filter((s) => categorize(s) === "pending")
          .sort(
            (a, b) =>
              new Date(b.created).getTime() - new Date(a.created).getTime(),
          );
        const expired = subscriptions
          .filter((s) => categorize(s) === "expired")
          .sort(
            (a, b) =>
              new Date(b.expires ?? 0).getTime() -
              new Date(a.expires ?? 0).getTime(),
          );
        // Sum active subscriptions per currency (baskets may bill in different
        // currencies, so we can't collapse to a single figure).
        const totals = new Map<string, number>();
        for (const s of active) {
          const t = monthlyTotal(s);
          totals.set(t.currency, (totals.get(t.currency) ?? 0) + t.amount);
        }
        return (
          <div className="flex flex-col gap-5">
            {active.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
                    <FormattedMessage defaultMessage="Active subscriptions" />
                  </span>
                  <span className="text-2xl leading-none text-cyber-text-bright tabular-nums">
                    {active.length}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
                    <FormattedMessage defaultMessage="Total per month" />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-end gap-x-2">
                    {[...totals.entries()].map(([currency, amount], i) => (
                      <span
                        key={currency}
                        className="text-xl leading-none text-cyber-primary tabular-nums"
                      >
                        {i > 0 && (
                          <span className="text-cyber-border">{" + "}</span>
                        )}
                        <CostAmount
                          cost={{ currency, amount, interval_type: "month" }}
                          converted={false}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <Group
              title={<FormattedMessage defaultMessage="Active" />}
              subs={active}
            />
            <Group
              title={<FormattedMessage defaultMessage="Pending payment" />}
              subs={pending}
              collapsible
              defaultOpen={active.length === 0}
            />
            <Group
              title={<FormattedMessage defaultMessage="Expired" />}
              subs={expired}
              collapsible
              defaultOpen={false}
            />
          </div>
        );
      })()}
    </div>
  );
}
