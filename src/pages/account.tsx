import { ReactNode, useEffect, useMemo, useState } from "react";
import { AccountDetail, LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import VpsInstanceRow from "../components/vps-instance";
import { expiryStatus, planCycleDays } from "../components/billing";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

function vmExpiry(vm: VmInstance) {
  return expiryStatus(vm.expires, planCycleDays(vm.template.cost_plan));
}

/** A VM the operator should act on: unpaid, lapsed, or about to lapse. */
function needsAction(vm: VmInstance) {
  const st = vmExpiry(vm);
  return st.isNew || st.expired || st.expiringSoon;
}

export default function AccountPage() {
  const login = useLogin();
  const [vms, setVms] = useState<Array<VmInstance>>([]);
  const [account, setAccount] = useState<AccountDetail>();

  async function loadVms(api: LNVpsApi) {
    setVms(await api.listVms());
  }

  useEffect(() => {
    if (login?.api) {
      loadVms(login.api);
      login.api.getAccount().then(setAccount).catch(console.error);
      const t = setInterval(() => loadVms(login.api), 5_000);
      return () => clearInterval(t);
    }
  }, [login]);

  const { action, healthy, running, stopped } = useMemo(() => {
    const action = vms.filter(needsAction);
    const healthy = vms.filter((v) => !needsAction(v));
    return {
      action,
      healthy,
      running: vms.filter((v) => v.status?.state === "running").length,
      stopped: vms.filter((v) => v.status?.state === "stopped").length,
    };
  }, [vms]);

  const reload = () => {
    if (login?.api) loadVms(login.api);
  };

  const identity =
    account?.email ??
    (login?.publicKey
      ? `${login.publicKey.slice(0, 8)}…${login.publicKey.slice(-4)}`
      : undefined);

  return (
    <div className="flex flex-col gap-6">
      {/* Header: who you are + the fleet at a glance + primary action */}
      <section className="overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="text-lg font-semibold text-cyber-text-bright leading-none">
              <FormattedMessage defaultMessage="Virtual Machines" />
            </h2>
            {identity && (
              <span className="text-xs text-cyber-muted truncate">
                <FormattedMessage
                  defaultMessage="Signed in as {identity}"
                  values={{
                    identity: (
                      <span className="font-mono text-cyber-text">
                        {identity}
                      </span>
                    ),
                  }}
                />
              </span>
            )}
          </div>
          <Link
            to="/"
            className="shrink-0 py-1.5 px-3 rounded-sm border border-cyber-primary text-cyber-primary text-sm hover:shadow-neon-sm transition-all"
          >
            <FormattedMessage defaultMessage="+ Deploy new" />
          </Link>
        </div>

        {vms.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-cyber-border bg-cyber-panel-light/40 px-4 py-2 font-mono text-xs">
            <FleetSegment
              dot="bg-cyber-primary shadow-neon-sm"
              className="text-cyber-text"
            >
              <FormattedMessage
                defaultMessage="{n} running"
                values={{ n: running }}
              />
            </FleetSegment>
            {stopped > 0 && (
              <FleetSegment
                dot="bg-cyber-danger shadow-neon-danger"
                className="text-cyber-text"
              >
                <FormattedMessage
                  defaultMessage="{n} stopped"
                  values={{ n: stopped }}
                />
              </FleetSegment>
            )}
            {action.length > 0 && (
              <FleetSegment dot="bg-cyber-warning" className="text-cyber-warning">
                <FormattedMessage
                  defaultMessage="{n} need renewal"
                  values={{ n: action.length }}
                />
              </FleetSegment>
            )}
          </div>
        )}
      </section>

      {/* Action required — grouped first so urgency is structural */}
      {action.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyber-danger shadow-neon-danger" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyber-danger">
              <FormattedMessage defaultMessage="Action required" />
            </h3>
          </div>
          {action.map((a) => (
            <VpsInstanceRow key={a.id} vm={a} onReload={reload} />
          ))}
        </section>
      )}

      {/* Healthy machines */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyber-muted">
          <FormattedMessage defaultMessage="Machines" />
        </h3>
        {vms.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 rounded-sm border border-dashed border-cyber-border text-center">
            <p className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="No machines yet. Spin one up in under a minute." />
            </p>
            <Link
              to="/"
              className="py-2 px-4 rounded-sm border border-cyber-primary text-cyber-primary text-sm hover:shadow-neon-sm transition-all"
            >
              <FormattedMessage defaultMessage="Deploy your first VPS" />
            </Link>
          </div>
        ) : healthy.length === 0 ? (
          <p className="rounded-sm border border-dashed border-cyber-border px-4 py-6 text-center text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="Every machine needs attention — clear the list above to see them here." />
          </p>
        ) : (
          healthy.map((a) => (
            <VpsInstanceRow key={a.id} vm={a} onReload={reload} />
          ))
        )}
      </section>
    </div>
  );
}

function FleetSegment({
  dot,
  className,
  children,
}: {
  dot: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
