import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { LoginState } from "../login";
import Seo from "../components/seo";
import Spinner from "../components/spinner";

/**
 * Landing route for the OAuth redirect. The API delivers the session token in
 * the URL fragment (`#token=<jwt>`) so it never hits a server log. We read it,
 * persist the session, scrub the token from history, then send the user on.
 */
export default function OAuthCompletePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  // Run exactly once: StrictMode invokes effects twice in dev, and the first
  // run clears the token from the hash — without this guard the second run
  // would see no token and flash a "sign-in failed" error.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const providerError = params.get("error");

    if (token) {
      LoginState.loginToken(token, "oauth");
      // Remove the token from the URL/history before navigating away.
      window.history.replaceState({}, "", window.location.pathname);
      navigate("/", { replace: true });
      return;
    }

    setError(providerError ?? "missing_token");
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Seo noindex={true} />
      {error ? (
        <>
          <h1 className="text-cyber-danger">
            <FormattedMessage defaultMessage="Sign-in failed" />
          </h1>
          <p className="text-cyber-text text-center max-w-md">
            <FormattedMessage defaultMessage="We couldn't complete the login. Please try again." />
          </p>
          <button
            className="text-cyber-accent underline"
            onClick={() => navigate("/login", { replace: true })}
          >
            <FormattedMessage defaultMessage="Back to sign in" />
          </button>
        </>
      ) : (
        <>
          <Spinner />
          <p className="text-cyber-text font-monospace">
            <FormattedMessage defaultMessage="Completing sign-in…" />
          </p>
        </>
      )}
    </div>
  );
}
