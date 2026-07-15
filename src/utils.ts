import { base16 } from "@scure/base";
import { AccountDetail } from "./api";

/**
 * Derive the VAT rate (as a fraction, e.g. 0.23 for 23%) that will currently be
 * charged to the user, from the read-only `account.tax` info. Pass the seller
 * `companyId` (from `vm.template.region.company_id`) to select the entry that
 * applies to that VM; when omitted or unmatched, falls back to a single entry.
 * Returns 0 when no taxable rate applies (e.g. reverse-charge / out-of-scope).
 */
export function accountTaxRate(
  account?: AccountDetail,
  companyId?: number,
): number {
  const entries = account?.tax;
  if (!entries || entries.length === 0) return 0;
  const match =
    (companyId !== undefined &&
      entries.find((e) => e.company_id === companyId)) ||
    (entries.length === 1 ? entries[0] : undefined);
  if (!match) return 0;
  const rate = match.rate;
  return Number.isFinite(rate) && rate > 0 ? rate / 100 : 0;
}

/**
 * Estimate a payment method's processing fee, mirroring the backend gross-up
 * `fee = gross * rate/(1-rate) + base` so the merchant nets the intended
 * amount. The base fee is only included when it's in the payment currency (we
 * can't convert client-side), so treat this as an estimate — the payment
 * screen shows the authoritative value.
 */
export function processingFeeEstimate(
  method: {
    processing_fee_rate?: number;
    processing_fee_base?: number;
    processing_fee_currency?: string;
  },
  paymentCurrency: string,
  grossAmount: number,
): number {
  const rate = (method.processing_fee_rate ?? 0) / 100;
  const pct =
    rate > 0 && rate < 1
      ? Math.ceil((grossAmount * rate) / (1 - rate))
      : 0;
  const sameCurrency =
    !method.processing_fee_currency ||
    method.processing_fee_currency.toUpperCase() ===
      paymentCurrency.toUpperCase();
  const base = sameCurrency ? (method.processing_fee_base ?? 0) : 0;
  return pct + base;
}

export async function openFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const elm = document.createElement("input");
    let lock = false;
    elm.type = "file";
    const handleInput = (e: Event) => {
      lock = true;
      const elm = e.target as HTMLInputElement;
      if ((elm.files?.length ?? 0) > 0) {
        resolve(elm.files![0]);
      } else {
        resolve(undefined);
      }
    };

    elm.onchange = (e) => handleInput(e);
    elm.click();
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!lock) {
            resolve(undefined);
          }
        }, 300);
      },
      { once: true },
    );
  });
}

export function toEui64(prefix: string, mac: string) {
  const macData = base16.decode(mac.replace(/:/g, "").toUpperCase());
  const macExtended = new Uint8Array([
    ...macData.subarray(0, 3),
    0xff,
    0xfe,
    ...macData.subarray(3, 6),
  ]);
  macExtended[0] |= 0x02;
  return (
    prefix +
    base16.encode(macExtended.subarray(0, 2)) +
    ":" +
    base16.encode(macExtended.subarray(2, 4)) +
    ":" +
    base16.encode(macExtended.subarray(4, 6)) +
    ":" +
    base16.encode(macExtended.subarray(6, 8))
  ).toLowerCase();
}

export function timeValueParts(
  n: number,
): { unit: string; value: number; extra?: number } | null {
  if (!Number.isFinite(n) || n < 0) return null;
  if (n >= 86400) return { unit: "day", value: Math.floor(n / 86400) };
  if (n >= 3600)
    return {
      unit: "hour",
      value: Math.floor(n / 3600),
      extra: Math.floor((n % 3600) / 60),
    };
  if (n >= 60) return { unit: "minute", value: Math.floor(n / 60) };
  return { unit: "second", value: n };
}
