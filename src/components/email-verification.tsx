import { useEffect, useState } from "react";
import { AccountDetail } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import { FormattedMessage, useIntl } from "react-intl";
import { requestEmailVerification } from "../utils/email-gate";

export function EmailVerification({
  account,
  show,
  loadError,
}: {
  account?: AccountDetail;
  show: boolean;
  loadError?: string;
}) {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setEmail(account?.email ?? "");
  }, [account?.email]);

  const shownError = error ?? loadError;
  if (!account || !show) {
    return shownError ? (
      <b className="text-cyber-danger">{shownError}</b>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm bg-cyber-panel px-4 py-3 border border-cyber-primary">
      <div className="font-semibold">
        <FormattedMessage defaultMessage="Email Verification Required" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Please verify your email address to complete your order." />
      </p>
      {sent ? (
        <p className="text-green-500 text-sm">
          <FormattedMessage defaultMessage="Verification email sent, please check your inbox." />
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            placeholder={formatMessage({ defaultMessage: "your@email.com" })}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="grow"
          />
          <AsyncButton
            disabled={!email}
            onClick={async () => {
              if (!login?.api) return;
              setError(undefined);
              try {
                await requestEmailVerification(login.api, account, email);
                setSent(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            <FormattedMessage defaultMessage="Send Verification" />
          </AsyncButton>
        </div>
      )}
      {shownError && <b className="text-cyber-danger">{shownError}</b>}
    </div>
  );
}
