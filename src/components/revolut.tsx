import RevolutCheckout from "@revolut/checkout";
import { Mode, RevolutCheckoutCardField } from "@revolut/checkout";
import { useEffect, useRef, useState } from "react";
import { AsyncButton } from "./button";
import { AccountDetail, VmPayment } from "../api";
import { CostAmount } from "./cost";
import useLogin from "../hooks/login";
import { timeValue } from "../utils";
import useTheme from "../hooks/theme";
import { default as iso } from "iso-3166-1";

interface RevolutProps {
  payment: VmPayment;
  account?: AccountDetail;
  onPaid: () => void;
  onCancel?: () => void;
  mode?: Mode;
}

export function RevolutPayWidget({
  payment,
  account,
  onPaid,
  onCancel,
  mode,
}: RevolutProps) {
  const login = useLogin();
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<{ destroy: () => void } | null>(null);
  const cardFieldRef = useRef<RevolutCheckoutCardField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [email, setEmail] = useState(account?.email ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [countryCode, setCountryCode] = useState(() => {
    if (!account?.country_code) return "";
    const entry = iso.whereAlpha3(account.country_code);
    return entry?.alpha2 ?? "";
  });
  const [postcode, setPostcode] = useState(account?.postcode ?? "");
  const [city, setCity] = useState(account?.city ?? "");
  const [streetLine1, setStreetLine1] = useState(account?.address_1 ?? "");
  const [streetLine2, setStreetLine2] = useState(account?.address_2 ?? "");
  const [saveDetails, setSaveDetails] = useState(true);

  useEffect(() => {
    if (!ref.current) return;

    let destroyed = false;

    const token = "revolut" in payment.data ? payment.data.revolut.token : "";
    RevolutCheckout(token, mode ?? "prod").then((instance) => {
      if (destroyed) {
        instance.destroy();
        return;
      }

      const isDark = theme === "dark";
      const cardField = instance.createCardField({
        target: ref.current!,
        theme: isDark ? "dark" : "light",
        hidePostcodeField: true,
        styles: {
          default: {
            color: isDark ? "#b8c4d0" : "#374151",
            fontSize: "15px",
            fontFamily: "'Source Code Pro', monospace",
            "::placeholder": {
              color: isDark ? "#4a5568" : "#9ca3af",
            },
          } as unknown as Partial<CSSStyleDeclaration>,
          focused: {
            color: isDark ? "#e2e8f0" : "#111827",
          } as unknown as Partial<CSSStyleDeclaration>,
          invalid: {
            color: isDark ? "#ff0040" : "#dc2626",
          } as unknown as Partial<CSSStyleDeclaration>,
        },
        onError: (err) => {
          setSubmitting(false);
          setError(err.message || "Payment failed");
        },
        onCancel: () => {
          setSubmitting(false);
          onCancel?.();
        },
      });

      cardFieldRef.current = cardField;
      instanceRef.current = instance;
    });

    return () => {
      destroyed = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
      cardFieldRef.current = null;
    };
  }, [payment, mode, theme]);

  useEffect(() => {
    if (!login?.api || !submitting) return;

    const tx = setInterval(async () => {
      try {
        const st = await login.api.paymentStatus(payment.id);
        if (st.is_paid) {
          clearInterval(tx);
          onPaid();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2_000);
    return () => clearInterval(tx);
  }, [login, payment.id, onPaid, submitting]);

  async function handleSubmit() {
    if (!cardFieldRef.current) return;
    if (!email || !name || !countryCode || !postcode) {
      setError("Please fill in all required fields");
      return;
    }
    if (saveDetails && login?.api) {
      try {
        const alpha3 =
          iso.whereAlpha2(countryCode)?.alpha3 ?? account?.country_code;
        await login.api.updateAccount({
          ...account,
          email,
          name,
          country_code: alpha3,
          postcode,
          city: city || undefined,
          address_1: streetLine1 || undefined,
          address_2: streetLine2 || undefined,
          contact_nip17: account?.contact_nip17 ?? false,
          contact_email: account?.contact_email ?? false,
        });
      } catch (e) {
        console.error("Failed to save account details:", e);
      }
    }
    setSubmitting(true);
    setError(undefined);
    cardFieldRef.current.submit({
      name,
      email,
      billingAddress: {
        countryCode: countryCode as never,
        postcode,
        city: city || undefined,
        streetLine1: streetLine1 || undefined,
        streetLine2: streetLine2 || undefined,
      },
    });
  }

  const total = payment.amount + payment.tax;
  const displayAmount = payment.currency === "BTC" ? total / 1000 : total / 100;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-4 bg-cyber-panel">
      <div className="text-center space-y-1">
        <div className="text-lg font-bold">
          <CostAmount
            cost={{ currency: payment.currency, amount: displayAmount }}
            converted={false}
          />
        </div>
        {payment.time > 0 && (
          <div className="text-sm text-cyber-muted">
            for {timeValue(payment.time)}
          </div>
        )}
        {payment.tax > 0 && (
          <div className="text-xs text-cyber-muted">
            including{" "}
            <CostAmount
              cost={{
                currency: payment.currency,
                amount:
                  payment.currency === "BTC"
                    ? payment.tax / 1000
                    : payment.tax / 100,
              }}
              converted={false}
            />{" "}
            tax
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-cyber-muted">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-cyber-muted">Cardholder Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-cyber-muted">Country *</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              <option value="">Select country</option>
              {iso.all().map((c) => (
                <option key={c.alpha2} value={c.alpha2}>
                  {c.country}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-cyber-muted">Postcode *</label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="10001"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-cyber-muted">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="New York"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-cyber-muted">Address Line 1</label>
          <input
            type="text"
            value={streetLine1}
            onChange={(e) => setStreetLine1(e.target.value)}
            placeholder="123 Main St"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-cyber-muted">Address Line 2</label>
          <input
            type="text"
            value={streetLine2}
            onChange={(e) => setStreetLine2(e.target.value)}
            placeholder="Apt 4B"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-cyber-muted cursor-pointer">
        <input
          type="checkbox"
          checked={saveDetails}
          onChange={(e) => setSaveDetails(e.target.checked)}
        />
        Save billing details to account
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-cyber-muted">Card Details</label>
        <div
          ref={ref}
          className="rounded-sm border border-cyber-border bg-cyber-panel-light p-3"
        />
      </div>
      {error && <div className="text-cyber-danger text-sm">{error}</div>}
      <AsyncButton onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Processing..." : "Pay Now"}
      </AsyncButton>
    </div>
  );
}
