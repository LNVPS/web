import { useCallback, useEffect, useState } from "react";
import type { AccountCredit } from "../api";
import {
  creditReadiness,
  type CreditReadiness,
  type Money,
} from "../utils/hourly";
import useLogin from "./login";
import useExchangeRates from "./useExchangeRates";

/**
 * The customer's account credit, loaded once for a surface that bills hourly.
 * `reload` re-reads it (after turning on auto-apply, or coming back from a
 * top-up).
 */
export function useAccountCredit(enabled = true) {
  const login = useLogin();
  const [credit, setCredit] = useState<AccountCredit>();
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (!login?.api) return;
    try {
      setCredit(await login.api.getAccountCredit());
      setFailed(false);
    } catch (e) {
      console.error("Failed to load account credit:", e);
      setFailed(true);
    }
  }, [login?.api]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return { credit, failed, reload, setCredit };
}

/** Readiness of the loaded balance against what is about to be charged. */
export function useCreditReadiness(
  credit: AccountCredit | undefined,
  needed?: Money,
): CreditReadiness | undefined {
  const { data: rates } = useExchangeRates();
  return credit ? creditReadiness(credit, needed, rates) : undefined;
}
