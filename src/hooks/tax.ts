import { ExternalStore } from "@snort/shared";
import { useEffect, useSyncExternalStore } from "react";
import { AccountTaxInfo, LNVpsApi } from "../api";
import useLogin from "./login";

/**
 * The VAT rates that currently apply to the logged-in account (one entry per
 * seller company, derived server-side from their billing details). Fetched once
 * per session and shared across every price on the page, so the "incl. tax"
 * toggle can gross-up without each `CostLabel` firing its own request.
 */
class TaxStore extends ExternalStore<Array<AccountTaxInfo> | undefined> {
  #rates?: Array<AccountTaxInfo>;
  #key?: string;
  #loading = false;

  takeSnapshot() {
    return this.#rates ? [...this.#rates] : undefined;
  }

  async load(api: LNVpsApi, key: string) {
    if (this.#loading) return;
    if (this.#key === key && this.#rates !== undefined) return;
    this.#loading = true;
    try {
      const account = await api.getAccount();
      this.#rates = account.tax ?? [];
      this.#key = key;
      this.notifyChange();
    } catch {
      // No billing info / not determinable — leave rates undefined so the
      // toggle stays hidden.
    } finally {
      this.#loading = false;
    }
  }

  reset() {
    this.#rates = undefined;
    this.#key = undefined;
    this.notifyChange();
  }
}

export const TaxState = new TaxStore();

/** Subscribe to the account's VAT rates, loading them once when logged in. */
export function useTaxRates(): Array<AccountTaxInfo> | undefined {
  const login = useLogin();
  const rates = useSyncExternalStore(
    (c) => TaxState.hook(c),
    () => TaxState.snapshot(),
    () => undefined,
  );
  const key = login?.publicKey || login?.type;
  useEffect(() => {
    if (login?.api && key) {
      TaxState.load(login.api, key);
    }
  }, [login?.api, key]);
  return rates;
}

/**
 * Resolve the VAT rate (whole %) for a seller company, falling back to the
 * primary (first) entry when the company isn't matched — correct for the
 * common single-company deployment. `undefined` means no rate is known.
 */
export function taxRateFor(
  rates: Array<AccountTaxInfo> | undefined,
  companyId?: number,
): number | undefined {
  if (!rates || rates.length === 0) return undefined;
  if (companyId !== undefined) {
    const match = rates.find((r) => r.company_id === companyId);
    if (match) return match.rate;
  }
  return rates[0].rate;
}
