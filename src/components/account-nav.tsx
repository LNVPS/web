import { NavLink, useNavigate } from "react-router-dom";
import useLogin from "../hooks/login";
import classNames from "classnames";

interface NavItem {
  to: string;
  label: string;
  description: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/account",
    label: "Overview",
    description: "Your VMs and domains",
    end: true,
  },
  {
    to: "/account/settings",
    label: "Settings",
    description: "Billing, renewal & notifications",
  },
  {
    to: "/account/messages",
    label: "Messages",
    description: "Encrypted direct messages",
  },
  {
    to: "/account/referral",
    label: "Referral",
    description: "Earn rewards by referring others",
  },
  {
    to: "/account/support",
    label: "Support",
    description: "Get help from the team",
  },
];

export default function AccountNav() {
  const login = useLogin();
  const navigate = useNavigate();

  if (!login) return null;

  return (
    <aside className="flex flex-col gap-4 w-56 shrink-0">
      {/* Navigation items */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              classNames(
                "flex flex-col gap-0.5 px-3 py-2 rounded-sm border transition-all duration-200",
                isActive
                  ? "border-cyber-primary bg-cyber-panel shadow-neon-sm text-cyber-primary"
                  : "border-transparent hover:border-cyber-border hover:bg-cyber-panel text-cyber-text hover:text-cyber-text-bright",
              )
            }
          >
            <span className="font-medium text-sm">{item.label}</span>
            <span className="text-xs text-cyber-muted">{item.description}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout — visually separated, danger-styled */}
      <div className="mt-auto pt-2 border-t border-cyber-border">
        <button
          onClick={() => {
            login.logout();
            navigate("/");
          }}
          className="w-full text-left px-3 py-2 rounded-sm border border-transparent text-cyber-muted text-sm hover:border-cyber-danger hover:text-cyber-danger transition-all duration-200"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
