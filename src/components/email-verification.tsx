import { useEffect, useState } from "react";
import { AccountDetail } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";

export function EmailVerification() {
  const login = useLogin();
  const [acc, setAcc] = useState<AccountDetail>();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    login?.api
      .getAccount()
      .then((a) => {
        if (!mounted) return;
        setAcc(a);
        setEmail(a.email ?? "");
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      mounted = false;
    };
  }, [login]);

  if (!acc || acc.email_verified) return null;

  return (
    <div className="flex flex-col gap-2 rounded-sm bg-cyber-panel px-4 py-3 border border-cyber-primary">
      <div className="font-semibold">Email Verification Required</div>
      <p className="text-cyber-muted text-sm">
        Please verify your email address to complete your order.
      </p>
      {sent ? (
        <p className="text-green-500 text-sm">
          Verification email sent, please check your inbox.
        </p>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="email"
            placeholder="your@email.com"
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
                await login.api.updateAccount({ ...acc, email });
                setSent(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Send Verification
          </AsyncButton>
        </div>
      )}
      {error && <b className="text-cyber-danger">{error}</b>}
    </div>
  );
}
