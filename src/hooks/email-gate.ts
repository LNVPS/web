import { useEffect, useState } from "react";
import type { AccountDetail } from "../api";
import { emailOrderGate } from "../utils/email-gate";
import useLogin from "./login";

export function useEmailGate() {
  const login = useLogin();
  const [account, setAccount] = useState<AccountDetail | null>();
  const [mailEnabled, setMailEnabled] = useState<boolean>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api) return;
    let mounted = true;
    login.api
      .getAccount()
      .then((a) => mounted && setAccount(a))
      .catch((e: unknown) => {
        if (!mounted) return;
        setAccount(null);
        setError(e instanceof Error ? e.message : String(e));
      });
    login.api
      .notificationChannels()
      .then((c) => mounted && setMailEnabled(c.email))
      .catch(() => mounted && setMailEnabled(true));
    return () => {
      mounted = false;
    };
  }, [login?.api]);

  return {
    account: account ?? undefined,
    error,
    gate: emailOrderGate(account, mailEnabled),
  };
}
