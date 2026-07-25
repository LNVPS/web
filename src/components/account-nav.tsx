import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useLogin from "../hooks/login";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

type Login = NonNullable<ReturnType<typeof useLogin>>;

interface NavItem {
  to: string;
  /** Match the path exactly (used for the index route). */
  end?: boolean;
  label: ReactNode;
  hint: ReactNode;
  /** Hide the item when this returns false (e.g. Nostr-only features). */
  show?: (login: Login) => boolean;
}

interface NavSection {
  title: ReactNode;
  items: Array<NavItem>;
}

/**
 * Account navigation as data, grouped by purpose. Products the user provisions
 * live in "Products" — adding a new offering is a single entry here — while
 * account-wide utilities live in "Account". Keep products in provisioning order.
 */
const SECTIONS: Array<NavSection> = [
  {
    title: <FormattedMessage defaultMessage="Products" />,
    items: [
      {
        to: "/account",
        end: true,
        label: <FormattedMessage defaultMessage="Virtual Machines" />,
        hint: <FormattedMessage defaultMessage="Deploy & manage servers" />,
      },
      {
        to: "/account/domains",
        label: <FormattedMessage defaultMessage="Nostr Domains" />,
        hint: <FormattedMessage defaultMessage="NIP-05 identity hosting" />,
      },
      {
        to: "/account/apps",
        label: <FormattedMessage defaultMessage="Apps" />,
        hint: <FormattedMessage defaultMessage="One-click Docker apps" />,
      },
      // New product offerings slot in here.
    ],
  },
  {
    title: <FormattedMessage defaultMessage="Account" />,
    items: [
      {
        to: "/account/subscriptions",
        label: <FormattedMessage defaultMessage="Subscriptions" />,
        hint: <FormattedMessage defaultMessage="Recurring services & billing" />,
      },
      {
        to: "/account/settings",
        label: <FormattedMessage defaultMessage="Settings" />,
        hint: (
          <FormattedMessage defaultMessage="Billing, renewal & notifications" />
        ),
      },
      {
        to: "/account/ssh-keys",
        label: <FormattedMessage defaultMessage="SSH Keys" />,
        hint: <FormattedMessage defaultMessage="Manage VM access keys" />,
      },
      {
        to: "/account/referral",
        label: <FormattedMessage defaultMessage="Referral" />,
        hint: (
          <FormattedMessage defaultMessage="Earn rewards by referring others" />
        ),
      },
      {
        to: "/account/messages",
        label: <FormattedMessage defaultMessage="Messages" />,
        hint: <FormattedMessage defaultMessage="Encrypted direct messages" />,
        // Nostr DMs need the account's Nostr key; token accounts don't have one.
        show: (login) => !login.isNostrless,
      },
      {
        to: "/account/support",
        label: <FormattedMessage defaultMessage="Support" />,
        hint: <FormattedMessage defaultMessage="Get help from the team" />,
      },
    ],
  },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
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
      <span className="text-xs text-cyber-muted">{item.hint}</span>
    </NavLink>
  );
}

export default function AccountNav() {
  const login = useLogin();
  const navigate = useNavigate();

  if (!login) return null;

  return (
    <aside className="flex flex-col gap-5 w-56 shrink-0">
      {SECTIONS.map((section, i) => {
        const items = section.items.filter((it) => !it.show || it.show(login));
        if (items.length === 0) return null;
        return (
          <nav key={i} className="flex flex-col gap-1">
            <div className="px-3 pb-1 text-[0.6rem] uppercase tracking-[0.25em] text-cyber-muted">
              {section.title}
            </div>
            {items.map((it) => (
              <NavItemLink key={it.to} item={it} />
            ))}
          </nav>
        );
      })}

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
