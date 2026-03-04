import { NavLink, useNavigate } from "react-router-dom";
import useLogin from "../hooks/login";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

export default function AccountNav() {
  const login = useLogin();
  const navigate = useNavigate();

  if (!login) return null;

  return (
    <aside className="flex flex-col gap-4 w-56 shrink-0">
      <nav className="flex flex-col gap-1">
        <NavLink
          to="/account"
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
          <span className="font-medium text-sm">
            <FormattedMessage defaultMessage="Overview" />
          </span>
          <span className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Your VMs and domains" />
          </span>
        </NavLink>
        <NavLink
          to="/account/settings"
          className={({ isActive }) =>
            classNames(
              "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
              isActive
                ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
                : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
            )
          }
        >
          <span className="font-medium text-sm">
            <FormattedMessage defaultMessage="Settings" />
          </span>
          <span className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Billing, renewal & notifications" />
          </span>
        </NavLink>
        <NavLink
          to="/account/messages"
          className={({ isActive }) =>
            classNames(
              "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
              isActive
                ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
                : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
            )
          }
        >
          <span className="font-medium text-sm">
            <FormattedMessage defaultMessage="Messages" />
          </span>
          <span className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Encrypted direct messages" />
          </span>
        </NavLink>
        <NavLink
          to="/account/referral"
          className={({ isActive }) =>
            classNames(
              "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
              isActive
                ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
                : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
            )
          }
        >
          <span className="font-medium text-sm">
            <FormattedMessage defaultMessage="Referral" />
          </span>
          <span className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Earn rewards by referring others" />
          </span>
        </NavLink>
        <NavLink
          to="/account/support"
          className={({ isActive }) =>
            classNames(
              "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
              isActive
                ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
                : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
            )
          }
        >
          <span className="font-medium text-sm">
            <FormattedMessage defaultMessage="Support" />
          </span>
          <span className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Get help from the team" />
          </span>
        </NavLink>
      </nav>

      <div className="mt-auto pt-2 border-t border-cyber-border">
        <button
          onClick={() => {
            login.logout();
            navigate("/");
          }}
          className="w-full text-left px-3 py-2 rounded-sm border border-transparent text-cyber-muted text-sm hover:border-cyber-danger hover:text-cyber-danger transition-all duration-200"
        >
          <FormattedMessage defaultMessage="Sign out" />
        </button>
      </div>
    </aside>
  );
}
