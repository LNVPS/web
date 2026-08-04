import { useState } from "react";
import { FormattedMessage } from "react-intl";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";

/**
 * "Log out everywhere" — invalidate every session token issued to this account.
 *
 * Session tokens are stateless JWTs valid for 30 days, so signing out in one
 * browser does not stop a token that leaked elsewhere. Revoking bumps a
 * server-side counter that every issued token is checked against, which kills
 * all of them at once — including this browser's, so we drop the local session
 * immediately afterwards and send the user back to sign in.
 *
 * Only meaningful for token accounts (`oauth` / `webauthn`). A Nostr account
 * authenticates by signing each request with its key, so there is no
 * server-issued token to revoke and nothing here to do.
 */
export default function SessionsSection({
  accountType,
}: {
  accountType?: "nostr" | "oauth" | "webauthn";
}) {
  const login = useLogin();
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  if (accountType === "nostr") {
    return (
      <p className="text-sm text-cyber-muted">
        <FormattedMessage defaultMessage="You sign in with a Nostr key, so there are no stored sessions to revoke. Each request is signed individually." />
      </p>
    );
  }

  async function onRevoke() {
    if (!login?.api) return;
    setError(undefined);
    try {
      await login.api.revokeAllSessions();
      // Our own token is now dead too — clear the local session so the UI
      // doesn't sit there firing requests that will all 401.
      login.logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-cyber-muted">
        <FormattedMessage defaultMessage="Signs you out of every browser and device, including this one. Use this if you've signed in somewhere you no longer trust." />
      </p>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <AsyncButton
            className="text-sm bg-cyber-danger/20 border-cyber-danger text-cyber-danger hover:bg-cyber-danger/30 hover:shadow-neon-danger"
            onClick={onRevoke}
          >
            <FormattedMessage defaultMessage="Yes, sign out everywhere" />
          </AsyncButton>
          <AsyncButton
            className="text-sm"
            onClick={() => setConfirming(false)}
          >
            <FormattedMessage defaultMessage="Cancel" />
          </AsyncButton>
        </div>
      ) : (
        <div>
          <AsyncButton
            className="text-sm"
            onClick={() => setConfirming(true)}
          >
            <FormattedMessage defaultMessage="Sign out everywhere" />
          </AsyncButton>
        </div>
      )}

      {error && <span className="text-sm text-cyber-danger">{error}</span>}
    </div>
  );
}
