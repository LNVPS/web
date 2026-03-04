import { useEffect, useState } from "react";
import {
  ReferralEarning,
  ReferralPayout,
  ReferralSignupRequest,
  ReferralState,
} from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { CopyButton } from "../components/copy-button";
import { CostAmount } from "../components/cost";
import { FormattedMessage, useIntl } from "react-intl";

type PayoutMethod = "lightning" | "nwc";

function deriveMethod(state: {
  lightning_address?: string;
  use_nwc: boolean;
}): PayoutMethod {
  return state.use_nwc ? "nwc" : "lightning";
}

export function AccountReferralPage() {
  const login = useLogin();
  const [state, setState] = useState<ReferralState | undefined>();
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [error, setError] = useState<string>();

  const [signupMethod, setSignupMethod] = useState<PayoutMethod>("lightning");
  const [signupAddress, setSignupAddress] = useState("");

  const [patchMethod, setPatchMethod] = useState<PayoutMethod>("lightning");
  const [patchAddress, setPatchAddress] = useState("");

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .getReferralState()
      .then((s) => {
        setState(s);
        setPatchMethod(deriveMethod(s));
        setPatchAddress(s.lightning_address ?? "");
      })
      .catch(() => {
        setNotEnrolled(true);
      });
  }, [login]);

  async function handleEnroll() {
    if (!login?.api) return;
    setError(undefined);
    const req: ReferralSignupRequest =
      signupMethod === "nwc"
        ? { use_nwc: true }
        : { lightning_address: signupAddress.trim() };
    try {
      await login.api.enrollReferral(req);
      const s = await login.api.getReferralState();
      setState(s);
      setPatchMethod(deriveMethod(s));
      setPatchAddress(s.lightning_address ?? "");
      setNotEnrolled(false);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function handleUpdate() {
    if (!login?.api) return;
    setError(undefined);
    try {
      const updated = await login.api.updateReferral(
        patchMethod === "nwc"
          ? { use_nwc: true, lightning_address: null }
          : { use_nwc: false, lightning_address: patchAddress.trim() || null },
      );
      setState((prev) =>
        prev
          ? {
              ...prev,
              lightning_address: updated.lightning_address,
              use_nwc: updated.use_nwc,
            }
          : prev,
      );
      setPatchMethod(deriveMethod(updated));
      setPatchAddress(updated.lightning_address ?? "");
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  if (!login) return;

  if (notEnrolled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xl">
          <FormattedMessage defaultMessage="Referral Program" />
        </div>
        <p className="text-cyber-muted text-sm">
          <FormattedMessage defaultMessage="Join the referral program to earn payouts when others sign up using your code. Choose how you want to receive payouts." />
        </p>
        <PayoutMethodSelector
          method={signupMethod}
          address={signupAddress}
          onMethodChange={setSignupMethod}
          onAddressChange={setSignupAddress}
        />
        <div>
          <AsyncButton onClick={handleEnroll}>
            <FormattedMessage defaultMessage="Join Referral Program" />
          </AsyncButton>
        </div>
        {error && <b className="text-cyber-danger">{error}</b>}
      </div>
    );
  }

  if (!state) return;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Referral Program" />
      </div>

      <div className="bg-cyber-panel rounded-sm px-4 py-3 flex flex-col gap-2">
        <div className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Your referral code" />
        </div>
        <pre className="select-all text-cyber-primary text-lg font-mono">
          {state.code}
        </pre>
        <div className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Share link" />
        </div>
        <div className="flex gap-2 items-center">
          <pre className="select-all text-sm font-mono bg-cyber-bg rounded-sm px-2 py-1 flex-1 break-all">
            {`${window.location.origin}/?ref=${state.code}`}
          </pre>
          <CopyButton text={`${window.location.origin}/?ref=${state.code}`} />
        </div>
        <div className="text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Share this link. When others sign up and pay, you earn a payout." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReferralStat
          label={<FormattedMessage defaultMessage="Successful Referrals" />}
          value={String(state.referrals_success)}
        />
        <ReferralStat
          label={<FormattedMessage defaultMessage="Failed Referrals" />}
          value={String(state.referrals_failed)}
        />
        {state.earned.map((e) => (
          <EarningStat key={e.currency} earning={e} />
        ))}
      </div>

      <div className="text-xl">
        <FormattedMessage defaultMessage="Payout Settings" />
      </div>
      <PayoutMethodSelector
        method={patchMethod}
        address={patchAddress}
        onMethodChange={setPatchMethod}
        onAddressChange={setPatchAddress}
      />
      <div>
        <AsyncButton onClick={handleUpdate}>
          <FormattedMessage defaultMessage="Save Payout Settings" />
        </AsyncButton>
      </div>
      {error && <b className="text-cyber-danger">{error}</b>}

      {state.payouts.length > 0 && (
        <>
          <div className="text-xl">
            <FormattedMessage defaultMessage="Payout History" />
          </div>
          <table className="table bg-cyber-panel rounded-sm text-center">
            <thead>
              <tr>
                <th>
                  <FormattedMessage defaultMessage="Date" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Amount" />
                </th>
                <th>
                  <FormattedMessage defaultMessage="Status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {state.payouts.map((p) => (
                <PayoutRow key={p.id} payout={p} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function PayoutMethodSelector({
  method,
  address,
  onMethodChange,
  onAddressChange,
}: {
  method: PayoutMethod;
  address: string;
  onMethodChange: (m: PayoutMethod) => void;
  onAddressChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="payout-method"
            checked={method === "lightning"}
            onChange={() => onMethodChange("lightning")}
          />
          <FormattedMessage defaultMessage="Lightning Address" />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="payout-method"
            checked={method === "nwc"}
            onChange={() => onMethodChange("nwc")}
          />
          <FormattedMessage defaultMessage="NWC Wallet" />
        </label>
      </div>
      {method === "lightning" && (
        <input
          type="text"
          placeholder="you@wallet.example"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
        />
      )}
      {method === "nwc" && (
        <p className="text-cyber-muted text-sm">
          <FormattedMessage defaultMessage="Payouts will be sent to the NWC wallet configured in your account settings." />
        </p>
      )}
    </div>
  );
}

function ReferralStat({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}) {
  return (
    <div className="bg-cyber-panel rounded-sm px-4 py-3 flex flex-col gap-1">
      <div className="text-xl font-mono">{value}</div>
      <div className="text-xs text-cyber-muted">{label}</div>
    </div>
  );
}

function EarningStat({ earning }: { earning: ReferralEarning }) {
  return (
    <div className="bg-cyber-panel rounded-sm px-4 py-3 flex flex-col gap-1">
      <div className="text-xl font-mono">
        <CostAmount
          cost={{ currency: earning.currency, amount: earning.amount }}
          converted={false}
        />
      </div>
      <div className="text-xs text-cyber-muted">
        <FormattedMessage
          defaultMessage="Earned ({currency})"
          values={{ currency: earning.currency }}
        />
      </div>
    </div>
  );
}

function PayoutRow({ payout }: { payout: ReferralPayout }) {
  const { locale } = useIntl();
  return (
    <tr>
      <td className="pl-4">
        {new Date(payout.created).toLocaleString(locale)}
      </td>
      <td>
        <CostAmount
          cost={{ currency: payout.currency, amount: payout.amount }}
          converted={false}
        />
      </td>
      <td>
        {payout.is_paid ? (
          <FormattedMessage defaultMessage="Paid" />
        ) : (
          <FormattedMessage defaultMessage="Pending" />
        )}
      </td>
    </tr>
  );
}
