import { AsyncButton } from "./button";
import useLogin from "../hooks/login";
import Profile from "./profile";
import { NostrLink } from "@snort/system";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FormattedMessage } from "react-intl";

export default function LoginButton() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  return !login ? (
    <AsyncButton
      onClick={async () => {
        navigate("/login", { state: location.state });
      }}
      className="border-cyber-primary text-cyber-primary hover:shadow-neon"
    >
      <FormattedMessage defaultMessage="Sign In" />
    </AsyncButton>
  ) : login.isNostrless ? (
    <Link
      to="/account"
      className="flex items-center gap-2 text-cyber-primary hover:shadow-neon transition-all"
    >
      <span className="w-10 h-10 rounded-sm border border-cyber-border bg-cyber-panel flex items-center justify-center text-cyber-primary">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <FormattedMessage defaultMessage="Account" />
    </Link>
  ) : (
    <Link to="/account">
      <Profile link={NostrLink.publicKey(login.publicKey)} />
    </Link>
  );
}
