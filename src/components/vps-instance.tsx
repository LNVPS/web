import { Link, useNavigate } from "react-router-dom";
import { VmInstance } from "../api";
import VpsResources from "./vps-resources";
import VmActions from "./vps-actions";
import { StatusPill, expiryStatus, planCycleDays } from "./billing";
import { Icon } from "./icon";
import { FormattedDate, FormattedMessage } from "react-intl";
import classNames from "classnames";

/** Whole days from now until `date` (negative once past). */
function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export default function VpsInstanceRow({
  vm,
  actions,
  onReload,
}: {
  vm: VmInstance;
  actions?: boolean;
  onReload?: () => void;
}) {
  const navigate = useNavigate();
  const st = expiryStatus(vm.expires, planCycleDays(vm.template.cost_plan));
  const deletingOn = vm.deleting_on ? new Date(vm.deleting_on) : undefined;
  const name = vm.ip_assignments?.[0]?.reverse_dns ?? vm.template?.name;
  const showLiveActions = !st.isNew && !st.expired && (actions ?? true);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/vm", { state: vm })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/vm", { state: vm });
        }
      }}
      className={classNames(
        "group overflow-hidden rounded-sm border bg-cyber-panel cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyber-primary",
        st.expired
          ? "border-cyber-danger/40 hover:border-cyber-danger"
          : st.expiringSoon
            ? "border-cyber-warning/40 hover:border-cyber-warning"
            : "border-cyber-border hover:border-cyber-primary hover:shadow-neon-sm",
      )}
    >
      {/* Identity line */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-mono text-xs text-cyber-muted shrink-0">
            #{vm.id}
          </span>
          <span className="truncate text-cyber-text-bright">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {st.isNew && (
            <Link
              to="/vm/billing/renew"
              state={vm}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-cyber-primary hover:shadow-neon-sm transition-all"
            >
              <FormattedMessage defaultMessage="Pay now" />
            </Link>
          )}
          {st.expired && (
            <Link
              to="/vm/billing/renew"
              state={vm}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-cyber-danger hover:shadow-neon-danger transition-all"
            >
              <FormattedMessage defaultMessage="Renew" />
            </Link>
          )}
          <StatusPill tone={st.tone}>
            {st.isNew ? (
              <FormattedMessage defaultMessage="New" />
            ) : st.expired ? (
              <FormattedMessage defaultMessage="Expired" />
            ) : st.expiringSoon ? (
              <FormattedMessage defaultMessage="Expiring soon" />
            ) : (
              <FormattedMessage defaultMessage="Active" />
            )}
          </StatusPill>
        </div>
      </div>

      {/* Specs + live state, with inline actions */}
      <div className="flex items-end justify-between gap-3 px-3 pb-2">
        <div className="flex flex-col gap-1 min-w-0">
          <VpsResources vm={vm} />
        </div>
        {showLiveActions && <VmActions vm={vm} onReload={onReload} />}
      </div>

      {/* Lease footer: healthy = countdown meter; lapsed = deletion notice */}
      <LeaseFooter
        st={st}
        expires={vm.expires}
        deletingOn={deletingOn}
        autoRenew={vm.auto_renewal_enabled ?? false}
      />
    </div>
  );
}

function LeaseFooter({
  st,
  expires,
  deletingOn,
  autoRenew,
}: {
  st: ReturnType<typeof expiryStatus>;
  expires?: string;
  deletingOn?: Date;
  autoRenew: boolean;
}) {
  // Lapsed lease in its deletion grace period — the fact that matters most.
  if (st.expired) {
    const delDays = deletingOn ? daysUntil(deletingOn) : undefined;
    const overdue = delDays !== undefined && delDays <= 0;
    return (
      <div className="flex items-center gap-2 border-t border-cyber-danger/30 bg-cyber-danger/5 px-3 py-1.5 text-xs text-cyber-danger">
        <Icon name="delete" size={13} className="shrink-0 pointer-events-none" />
        {deletingOn === undefined ? (
          <FormattedMessage defaultMessage="Lease expired — renew to keep this machine." />
        ) : overdue ? (
          <FormattedMessage defaultMessage="Past grace period — may be deleted at any time. Renew now to keep your data." />
        ) : (
          <FormattedMessage
            defaultMessage="Deletes in {days, plural, one {# day} other {# days}} · {date} — renew to keep your data."
            values={{
              days: delDays,
              date: (
                <FormattedDate value={deletingOn} month="short" day="numeric" />
              ),
            }}
          />
        )}
      </div>
    );
  }

  if (st.isNew) {
    return (
      <div className="border-t border-cyber-border bg-cyber-panel-light/40 px-3 py-1.5 text-xs text-cyber-muted">
        <FormattedMessage defaultMessage="Not activated yet — pay to bring it online." />
      </div>
    );
  }

  // Active / expiring soon: a hairline lease meter with days remaining.
  const fill = st.expiringSoon ? "bg-cyber-warning" : "bg-cyber-primary";
  return (
    <div className="flex items-center gap-2 border-t border-cyber-border px-3 py-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-cyber-panel-light border border-cyber-border">
        <div
          className={classNames("h-full rounded-full", fill)}
          style={{ width: `${st.meterPct}%` }}
        />
      </div>
      <span
        className={classNames(
          "shrink-0 text-[0.7rem] tabular-nums whitespace-nowrap",
          st.expiringSoon ? "text-cyber-warning" : "text-cyber-muted",
        )}
      >
        <FormattedMessage
          defaultMessage="{days, plural, one {# day left} other {# days left}}"
          values={{ days: st.daysLeft }}
        />
        {expires && (
          <>
            {" · "}
            {autoRenew ? (
              <span className="inline-flex items-center gap-1 align-bottom text-cyber-primary">
                <Icon
                  name="refresh-1"
                  size={11}
                  className="shrink-0 pointer-events-none"
                />
                <FormattedMessage
                  defaultMessage="auto-renews {date}"
                  values={{
                    date: (
                      <FormattedDate
                        value={expires}
                        month="short"
                        day="numeric"
                      />
                    ),
                  }}
                />
              </span>
            ) : (
              <FormattedDate value={expires} month="short" day="numeric" />
            )}
          </>
        )}
      </span>
    </div>
  );
}
