import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { VmInstance } from "../api";
import Seo from "../components/seo";

export default function VmLayout() {
  const { state } = useLocation() as { state?: VmInstance };

  if (!state) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/account">
          &lt; <FormattedMessage defaultMessage="Back" />
        </Link>
        <h2>
          <FormattedMessage defaultMessage="No VM selected" />
        </h2>
      </div>
    );
  }

  function navLink(to: string, label: React.ReactNode, sub: React.ReactNode) {
    return (
      <NavLink
        to={to}
        state={state}
        end
        className={({ isActive }) =>
          classNames(
            "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
            isActive
              ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
              : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
          )
        }
      >
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-cyber-muted">{sub}</span>
      </NavLink>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <Link
        to="/account"
        className="text-sm text-cyber-muted hover:text-cyber-text transition-all"
      >
        &lt; <FormattedMessage defaultMessage="Back to account" />
      </Link>
      <div className="flex items-baseline gap-2">
        <span className="text-cyber-muted text-sm">#{state.id}</span>
        <span className="text-cyber-text-bright font-medium">
          {state.ip_assignments?.[0]?.reverse_dns ?? state.template?.name}
        </span>
      </div>
      <div className="flex gap-6 items-start">
        <aside className="flex flex-col gap-1 w-44 shrink-0">
          {navLink(
            "/vm",
            <FormattedMessage defaultMessage="Overview" />,
            <FormattedMessage defaultMessage="Details & SSH" />,
          )}
          {navLink(
            "/vm/billing",
            <FormattedMessage defaultMessage="Billing" />,
            <FormattedMessage defaultMessage="Payments & renewal" />,
          )}
          {navLink(
            "/vm/console",
            <FormattedMessage defaultMessage="Console" />,
            <FormattedMessage defaultMessage="Serial terminal" />,
          )}
          {navLink(
            "/vm/graphs",
            <FormattedMessage defaultMessage="Graphs" />,
            <FormattedMessage defaultMessage="CPU, RAM & network" />,
          )}
          {navLink(
            "/vm/history",
            <FormattedMessage defaultMessage="History" />,
            <FormattedMessage defaultMessage="Audit log" />,
          )}
          {navLink(
            "/vm/upgrade",
            <FormattedMessage defaultMessage="Upgrade" />,
            <FormattedMessage defaultMessage="Resize VM specs" />,
          )}
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
