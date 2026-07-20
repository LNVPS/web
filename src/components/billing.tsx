import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FormattedDate, FormattedMessage } from "react-intl";
import {
  CostPlanIntervalType,
  SavedPaymentMethod,
  Subscription,
  VmCostPlan,
} from "../api";
import { AsyncButton } from "./button";
import { CostAmount } from "./cost";
import { Card, CardBody, CardTitle } from "./card";
import { iconColorClass } from "./checkout-method-rows";
import { Icon } from "./icon";

/**
 * Shared billing views used by both the VM billing page and the subscription
 * detail page, so a subscription (which is what a VM is billed under) looks and
 * behaves identically wherever it's shown: a status card with a lease meter, an
 * auto-renew control, and a payment history table.
 */

export type BillingTone = "primary" | "warning" | "danger" | "muted";

const TONE: Record<BillingTone, { pill: string; fill: string }> = {
  primary: {
    pill: "text-cyber-primary border-cyber-primary/50 bg-cyber-primary/10",
    fill: "bg-cyber-primary",
  },
  warning: {
    pill: "text-cyber-warning border-cyber-warning/50 bg-cyber-warning/10",
    fill: "bg-cyber-warning",
  },
  danger: {
    pill: "text-cyber-danger border-cyber-danger/50 bg-cyber-danger/10",
    fill: "bg-cyber-danger",
  },
  muted: {
    pill: "text-cyber-muted border-cyber-border bg-cyber-panel-light",
    fill: "bg-cyber-muted",
  },
};

export interface ExpiryStatus {
  /** True when there's no expiry yet (never paid / not provisioned). */
  isNew: boolean;
  expired: boolean;
  expiringSoon: boolean;
  tone: BillingTone;
  /** Fill percentage for the lease meter (0–100). */
  meterPct: number;
  /** Whole days remaining (0 when expired/new). */
  daysLeft: number;
}

/** A small tone-coloured status pill, shared across billing surfaces. */
export function StatusPill({
  tone,
  children,
}: {
  tone: BillingTone;
  children: ReactNode;
}) {
  return (
    <span
      className={
        "text-[0.65rem] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border " +
        TONE[tone].pill
      }
    >
      {children}
    </span>
  );
}

/** Status label + tone for a subscription (or VM billed under one). */
export function subscriptionStatus(sub: Subscription): {
  tone: BillingTone;
  label: ReactNode;
} {
  const st = expiryStatus(sub.expires, 30);
  if (!sub.is_active && !st.expired) {
    return {
      tone: "warning",
      label: <FormattedMessage defaultMessage="Pending payment" />,
    };
  }
  if (st.expired) {
    return { tone: "danger", label: <FormattedMessage defaultMessage="Expired" /> };
  }
  if (st.expiringSoon) {
    return {
      tone: "warning",
      label: <FormattedMessage defaultMessage="Expiring soon" />,
    };
  }
  return { tone: "primary", label: <FormattedMessage defaultMessage="Active" /> };
}

/** Length of one billing cycle in days, used to scale the expiry meter. */
export function planCycleDays(plan: VmCostPlan): number {
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

/** Derive status/tone/meter from an expiry date and the billing cycle length. */
export function expiryStatus(
  expires: string | undefined,
  cycleDays: number,
): ExpiryStatus {
  if (!expires) {
    return {
      isNew: true,
      expired: false,
      expiringSoon: false,
      tone: "muted",
      meterPct: 0,
      daysLeft: 0,
    };
  }
  const days = (new Date(expires).getTime() - Date.now()) / 86_400_000;
  const expired = days <= 0;
  const expiringSoon = !expired && days <= 3;
  return {
    isNew: false,
    expired,
    expiringSoon,
    tone: expired ? "danger" : expiringSoon ? "warning" : "primary",
    meterPct: expired ? 100 : Math.min(100, Math.max(4, (days / cycleDays) * 100)),
    daysLeft: Math.max(0, Math.floor(days)),
  };
}

/** Icon id for a saved payment method (card brand, wallet, or provider). */
export function savedMethodIcon(m: SavedPaymentMethod): string {
  const brand = m.card_brand?.toLowerCase();
  if (brand === "visa") return "visa";
  if (brand === "mastercard") return "mastercard";
  if (m.provider === "nwc") return "nwc";
  if (m.provider === "revolut") return "revolut";
  return "bitcoin";
}

/** Short human label for a saved payment method. */
export function savedMethodLabel(m: SavedPaymentMethod): string {
  if (m.card_brand) {
    const last4 = m.card_last_four ? ` •••• ${m.card_last_four}` : "";
    return `${m.card_brand}${last4}`;
  }
  if (m.name?.trim()) return m.name.trim();
  if (m.provider === "nwc") return "Nostr Wallet Connect";
  return m.provider.toUpperCase();
}

/** Status card: header + status pill, price, next-payment date, lease meter,
 * an optional warning, and a primary call to action. */
export function BillingStatusCard({
  eyebrow,
  statusLabel,
  tone,
  priceLabel,
  price,
  dateLabel,
  date,
  meterPct,
  meterLeft,
  meterRight,
  warning,
  cta,
}: {
  eyebrow: ReactNode;
  statusLabel: ReactNode;
  tone: BillingTone;
  priceLabel: ReactNode;
  price: ReactNode;
  dateLabel: ReactNode;
  date: ReactNode;
  meterPct: number;
  meterLeft: ReactNode;
  meterRight: ReactNode;
  warning?: ReactNode;
  cta: { label: ReactNode; onClick: () => void; disabled?: boolean };
}) {
  return (
    <Card>
      <CardTitle right={<StatusPill tone={tone}>{statusLabel}</StatusPill>}>
        {eyebrow}
      </CardTitle>
      <CardBody className="px-4 py-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              {priceLabel}
            </span>
            <span className="text-2xl text-cyber-text-bright leading-none flex items-baseline gap-1">
              {price}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              {dateLabel}
            </span>
            <span className="text-cyber-text-bright">{date}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-cyber-panel-light border border-cyber-border overflow-hidden">
            <div
              className={
                "h-full rounded-full transition-all duration-500 " +
                TONE[tone].fill
              }
              style={{ width: `${meterPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[0.7rem] text-cyber-text">
            <span className={tone === "danger" ? "text-cyber-danger" : undefined}>
              {meterLeft}
            </span>
            <span className="uppercase tracking-wider">{meterRight}</span>
          </div>
        </div>

        {warning}

        <AsyncButton
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="w-full justify-center bg-cyber-primary/20 border-cyber-primary text-cyber-primary font-bold hover:bg-cyber-primary/30 hover:shadow-neon"
        >
          {cta.label}
        </AsyncButton>
      </CardBody>
    </Card>
  );
}

/** A red "will be deleted" warning for use as the status card's `warning`. */
export function DeletionWarning({ deletingOn }: { deletingOn: Date }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-cyber-danger/40 bg-cyber-danger/10 px-3 py-2 text-xs text-cyber-danger">
      <Icon name="delete" size={14} className="shrink-0 pointer-events-none" />
      {deletingOn.getTime() <= Date.now() ? (
        <FormattedMessage defaultMessage="This is past its grace period and may be deleted at any time. Renew now to keep it." />
      ) : (
        <FormattedMessage
          defaultMessage="Renew before {date} or this and its data will be permanently deleted."
          values={{
            date: (
              <FormattedDate
                value={deletingOn}
                year="numeric"
                month="short"
                day="numeric"
              />
            ),
          }}
        />
      )}
    </div>
  );
}

/** Auto-renew control with the default saved payment method. Read-only when no
 * `onToggle` is supplied (e.g. where there's no endpoint to change it). */
export function AutoRenewCard({
  enabled,
  description,
  defaultMethod,
  onToggle,
  saving,
}: {
  enabled: boolean;
  description: ReactNode;
  defaultMethod?: SavedPaymentMethod;
  onToggle?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border border-cyber-border bg-cyber-panel rounded-sm px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-cyber-text-bright text-sm">
            <FormattedMessage defaultMessage="Auto-renew" />
          </span>
          <span className="text-xs text-cyber-text leading-relaxed max-w-md">
            {description}
          </span>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle auto-renew"
          disabled={saving || !onToggle}
          onClick={onToggle}
          className={
            "relative shrink-0 h-6 w-11 rounded-full border transition-colors duration-200 disabled:opacity-50 " +
            (onToggle ? "" : "cursor-default ") +
            (enabled
              ? "bg-cyber-primary/25 border-cyber-primary shadow-neon-sm"
              : "bg-cyber-panel-light border-cyber-border")
          }
        >
          <span
            className={
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition-all duration-200 " +
              (enabled
                ? "left-[calc(100%-1.15rem)] bg-cyber-primary"
                : "left-1 bg-cyber-muted")
            }
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-cyber-border/60 pt-3">
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
          <FormattedMessage defaultMessage="Default method" />
        </span>
        {defaultMethod ? (
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-sm bg-cyber-panel-light border border-cyber-border flex items-center justify-center">
              <Icon
                name={savedMethodIcon(defaultMethod)}
                size={15}
                className={iconColorClass(savedMethodIcon(defaultMethod))}
              />
            </span>
            <span className="text-sm text-cyber-text uppercase">
              {savedMethodLabel(defaultMethod)}
            </span>
          </span>
        ) : (
          <Link
            to="/account/settings"
            className={
              "text-xs transition-colors hover:text-cyber-primary " +
              (enabled ? "text-cyber-warning" : "text-cyber-muted")
            }
          >
            <FormattedMessage defaultMessage="None set — add one" />
          </Link>
        )}
      </div>
    </div>
  );
}

export interface PaymentRow {
  id: string;
  created: string;
  amount: { currency: string; amount: number };
  method: ReactNode;
  status: ReactNode;
  statusTone?: BillingTone;
  action?: ReactNode;
}

/** Payment history list, uniform across VM and subscription billing. */
export function BillingPaymentsTable({
  rows,
}: {
  rows: Array<PaymentRow>;
  /** @deprecated action column is always rendered when a row has an action. */
  hasAction?: boolean;
}) {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
  return (
    <Card>
      <CardTitle
        right={
          sorted.length > 0 && (
            <span className="text-[0.65rem] tabular-nums text-cyber-muted">
              {sorted.length}
            </span>
          )
        }
      >
        <FormattedMessage defaultMessage="Payment history" />
      </CardTitle>
      <CardBody className="p-0">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="No payments yet." />
          </div>
        ) : (
          <ul className="divide-y divide-cyber-border/60">
            {sorted.map((r) => (
              <li
                key={r.id}
                className="group flex items-center gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-cyber-text-bright">
                    <FormattedDate
                      value={r.created}
                      year="numeric"
                      month="short"
                      day="numeric"
                    />
                  </span>
                  <span className="text-[0.7rem] uppercase tracking-wider text-cyber-muted">
                    <FormattedDate
                      value={r.created}
                      hour="2-digit"
                      minute="2-digit"
                    />
                    <span className="mx-1.5 text-cyber-border">·</span>
                    {r.method}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span className="tabular-nums text-cyber-text-bright">
                    <CostAmount cost={r.amount} converted={false} />
                  </span>
                  <span className="w-24 text-right">
                    {r.statusTone ? (
                      <StatusPill tone={r.statusTone}>{r.status}</StatusPill>
                    ) : (
                      <span className="text-xs text-cyber-muted">
                        {r.status}
                      </span>
                    )}
                  </span>
                  <span className="flex w-5 justify-center text-cyber-muted transition-colors hover:text-cyber-primary">
                    {r.action}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
