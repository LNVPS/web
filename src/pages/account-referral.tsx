import { ReactNode, useEffect, useState } from "react";
import {
  ReferralEarning,
  ReferralPayout,
  ReferralPayoutMode,
  ReferralSignupRequest,
  ReferralState,
  ReferralUsage,
} from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { CopyButton } from "../components/copy-button";
import { CostAmount } from "../components/cost";
import { PaymentMethods } from "../components/payment-methods";
import { FormattedDate, FormattedMessage, FormattedNumber } from "react-intl";

// `account_credit` is a defined-but-unimplemented server mode, so the UI only
// offers the three selectable payout methods.
type SelectableMode = "lightning_address" | "nwc" | "on_chain";

function toSelectable(mode: ReferralPayoutMode): SelectableMode {
  return mode === "nwc" || mode === "on_chain" ? mode : "lightning_address";
}

/** The stored address matching a payout method (the input's prefill). */
function addressFor(m: SelectableMode, s?: ReferralState): string {
  if (m === "on_chain") return s?.onchain_address ?? "";
  if (m === "lightning_address") return s?.lightning_address ?? "";
  return "";
}

/** Small uppercase section marker used to label each block of the page. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-cyber-primary">
      <span className="h-px w-4 bg-cyber-border-bright" />
      <span className="text-xs uppercase tracking-[0.25em] font-medium">
        {children}
      </span>
    </div>
  );
}

export function AccountReferralPage() {
  const login = useLogin();
  const [state, setState] = useState<ReferralState | undefined>();
  const [usage, setUsage] = useState<Array<ReferralUsage>>([]);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [error, setError] = useState<string>();

  const [signupMethod, setSignupMethod] =
    useState<SelectableMode>("lightning_address");
  const [signupAddress, setSignupAddress] = useState("");

  const [patchMethod, setPatchMethod] =
    useState<SelectableMode>("lightning_address");
  const [patchAddress, setPatchAddress] = useState("");

  function applyState(s: ReferralState) {
    setState(s);
    const m = toSelectable(s.mode);
    setPatchMethod(m);
    setPatchAddress(addressFor(m, s));
  }

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .getReferralState()
      .then((s) => {
        applyState(s);
        login.api
          ?.getReferralUsage()
          .then((r) => setUsage(r.data))
          .catch(() => setUsage([]));
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
        ? { mode: "nwc" }
        : signupMethod === "on_chain"
          ? { mode: "on_chain", onchain_address: signupAddress.trim() }
          : {
              mode: "lightning_address",
              lightning_address: signupAddress.trim(),
            };
    try {
      await login.api.enrollReferral(req);
      const s = await login.api.getReferralState();
      applyState(s);
      setNotEnrolled(false);
      login.api
        .getReferralUsage()
        .then((r) => setUsage(r.data))
        .catch(() => setUsage([]));
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
          ? { mode: "nwc", lightning_address: null }
          : patchMethod === "on_chain"
            ? { mode: "on_chain", onchain_address: patchAddress.trim() || null }
            : {
                mode: "lightning_address",
                lightning_address: patchAddress.trim() || null,
              },
      );
      setState((prev) =>
        prev
          ? {
              ...prev,
              lightning_address: updated.lightning_address,
              onchain_address: updated.onchain_address,
              mode: updated.mode,
              referral_rate: updated.referral_rate,
            }
          : prev,
      );
      const m = toSelectable(updated.mode);
      setPatchMethod(m);
      setPatchAddress(
        m === "on_chain"
          ? (updated.onchain_address ?? "")
          : (updated.lightning_address ?? ""),
      );
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function handleLeave() {
    if (!login?.api) return;
    setError(undefined);
    try {
      await login.api.leaveReferral();
      setState(undefined);
      setUsage([]);
      setNotEnrolled(true);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  if (!login) return;

  // ── Not enrolled: activation call-to-action ────────────────────────────────
  if (notEnrolled) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <Eyebrow>
          <FormattedMessage defaultMessage="Referral Program" />
        </Eyebrow>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl text-cyber-text-bright">
            <FormattedMessage defaultMessage="Turn your code into commission" />
          </h1>
          <p className="text-cyber-muted text-sm max-w-prose">
            <FormattedMessage defaultMessage="Get a referral code to share. You earn a commission when someone signs up with it and their VM makes its first payment. Pick where payouts should land, then activate." />
          </p>
        </div>
        <div className="rounded-sm border border-cyber-border bg-cyber-panel p-5 flex flex-col gap-4">
          <Eyebrow>
            <FormattedMessage defaultMessage="Payout Route" />
          </Eyebrow>
          <PayoutMethodSelector
            method={signupMethod}
            address={signupAddress}
            onMethodChange={(m) => {
              setSignupMethod(m);
              setSignupAddress("");
            }}
            onAddressChange={setSignupAddress}
          />
          <div>
            <AsyncButton
              className="bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
              onClick={handleEnroll}
            >
              <FormattedMessage defaultMessage="Activate Referral Code" />
            </AsyncButton>
          </div>
          {error && (
            <b className="text-cyber-danger text-sm break-words">{error}</b>
          )}
        </div>
      </div>
    );
  }

  if (!state) return;

  const shareLink = `${window.location.origin}/?ref=${state.code}`;
  const success = state.referrals_success;
  const failed = state.referrals_failed;
  const total = success + failed;
  const rate = total > 0 ? success / total : 0;
  const canLeave = state.payouts.length === 0;

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Eyebrow>
          <FormattedMessage defaultMessage="Referral Program" />
        </Eyebrow>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyber-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-60 animate-ping motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyber-primary" />
          </span>
          <FormattedMessage defaultMessage="Active" />
        </div>
      </div>

      {/* ── Hero: the code as a broadcast beacon ───────────────────────────── */}
      <div className="relative rounded-sm border border-cyber-border-bright bg-cyber-darker px-6 py-8 shadow-neon-inset overflow-hidden">
        {/* targeting-reticle corners */}
        <span className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t border-l border-cyber-primary/60" />
        <span className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-t border-r border-cyber-primary/60" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-cyber-primary/60" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-cyber-primary/60" />

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.3em] text-cyber-muted">
            <FormattedMessage defaultMessage="Your referral code" />
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-cyber-muted font-mono text-lg select-none">
              ref://
            </span>
            <span className="text-cyber-primary font-bold font-mono text-4xl md:text-5xl select-all break-all [text-shadow:0_0_14px_oklch(0.8_0.3_142_/_0.45)]">
              {state.code}
            </span>
            {state.effective_referral_rate != null && (
              <span className="ml-auto rounded-sm border border-cyber-border bg-cyber-panel px-2 py-1 text-xs text-cyber-accent">
                <FormattedMessage
                  defaultMessage="{rate} commission"
                  values={{
                    rate: (
                      <FormattedNumber
                        value={state.effective_referral_rate / 100}
                        style="percent"
                        maximumFractionDigits={2}
                      />
                    ),
                  }}
                />
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-cyber-muted">
            <FormattedMessage defaultMessage="Share link" />
          </span>
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 flex items-center gap-2 bg-cyber-panel border border-cyber-border rounded-sm px-3 py-2 font-mono text-sm min-w-0">
              <span className="text-cyber-primary select-none">$</span>
              <span className="select-all truncate text-cyber-text">
                {shareLink}
              </span>
            </div>
            <CopyButton text={shareLink} />
          </div>
          <p className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Share this link. You earn a commission when someone signs up and their VM makes its first payment." />
          </p>
        </div>
      </div>

      {/* ── Conversion meter ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Eyebrow>
          <FormattedMessage defaultMessage="Conversion" />
        </Eyebrow>
        {total > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-mono text-cyber-primary tabular-nums">
                  <FormattedNumber
                    value={rate}
                    style="percent"
                    maximumFractionDigits={0}
                  />
                </span>
                <span className="text-xs uppercase tracking-widest text-cyber-muted">
                  <FormattedMessage defaultMessage="converted" />
                </span>
              </div>
              <span className="text-sm font-mono text-cyber-muted tabular-nums">
                <FormattedMessage
                  defaultMessage="{success} of {total} referrals paid"
                  values={{ success, total }}
                />
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
              <div
                className="bg-cyber-primary transition-all duration-500"
                style={{ width: `${rate * 100}%` }}
                aria-hidden
              />
              <div
                className="bg-cyber-danger/40 transition-all duration-500"
                style={{ width: `${(1 - rate) * 100}%` }}
                aria-hidden
              />
            </div>
            <div className="flex gap-6 text-xs font-mono">
              <span className="flex items-center gap-2 text-cyber-text">
                <span className="h-2 w-2 rounded-sm bg-cyber-primary" />
                <FormattedMessage
                  defaultMessage="{success} paid"
                  values={{ success }}
                />
              </span>
              <span className="flex items-center gap-2 text-cyber-muted">
                <span className="h-2 w-2 rounded-sm bg-cyber-danger/40" />
                <FormattedMessage
                  defaultMessage="{failed} never paid"
                  values={{ failed }}
                />
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="No referrals yet. Share your link to start converting." />
          </p>
        )}
      </div>

      {/* ── Earnings ───────────────────────────────────────────────────────── */}
      {state.earned.length > 0 && (
        <div className="flex flex-col gap-4">
          <Eyebrow>
            <FormattedMessage defaultMessage="Earned" />
          </Eyebrow>
          <div className="flex flex-wrap gap-3">
            {state.earned.map((e) => (
              <EarningChip key={e.currency} earning={e} />
            ))}
          </div>
        </div>
      )}

      {/* ── Referral breakdown ─────────────────────────────────────────────── */}
      {usage.length > 0 && (
        <div className="flex flex-col gap-4">
          <Eyebrow>
            <FormattedMessage defaultMessage="Breakdown" />
          </Eyebrow>
          <div className="overflow-hidden rounded-sm border border-cyber-border">
            <table className="table text-left">
              <thead>
                <tr>
                  <th className="!text-left">
                    <FormattedMessage defaultMessage="Date" />
                  </th>
                  <th className="!text-right">
                    <FormattedMessage defaultMessage="Payment" />
                  </th>
                  <th className="!text-right">
                    <FormattedMessage defaultMessage="Rate" />
                  </th>
                  <th className="!text-right">
                    <FormattedMessage defaultMessage="Commission" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <UsageRow key={i} usage={u} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payout history ─────────────────────────────────────────────────── */}
      {state.payouts.length > 0 && (
        <div className="flex flex-col gap-4">
          <Eyebrow>
            <FormattedMessage defaultMessage="Payouts" />
          </Eyebrow>
          <div className="overflow-hidden rounded-sm border border-cyber-border">
            <table className="table text-left">
              <thead>
                <tr>
                  <th className="!text-left">
                    <FormattedMessage defaultMessage="Date" />
                  </th>
                  <th className="!text-right">
                    <FormattedMessage defaultMessage="Amount" />
                  </th>
                  <th className="!text-right">
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
          </div>
        </div>
      )}

      {/* ── Payout settings ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Eyebrow>
          <FormattedMessage defaultMessage="Payout Route" />
        </Eyebrow>
        <PayoutMethodSelector
          method={patchMethod}
          address={patchAddress}
          onMethodChange={(m) => {
            setPatchMethod(m);
            setPatchAddress(addressFor(m, state));
          }}
          onAddressChange={setPatchAddress}
        />
        <div>
          <AsyncButton onClick={handleUpdate}>
            <FormattedMessage defaultMessage="Save Payout Route" />
          </AsyncButton>
        </div>
        {error && (
          <b className="text-cyber-danger text-sm break-words">{error}</b>
        )}
      </div>

      {/* ── Leave program ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-t border-cyber-border pt-6">
        <Eyebrow>
          <FormattedMessage defaultMessage="Leave Program" />
        </Eyebrow>
        {canLeave ? (
          <>
            <p className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="Leave any time. Your code stops earning and can't be reused." />
            </p>
            <div>
              <AsyncButton
                className="!bg-cyber-danger/15 !border-cyber-danger !text-cyber-danger hover:!bg-cyber-danger/25 hover:!border-cyber-danger hover:!text-cyber-danger hover:!shadow-none"
                onClick={handleLeave}
              >
                <FormattedMessage defaultMessage="Leave Referral Program" />
              </AsyncButton>
            </div>
          </>
        ) : (
          <p className="text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="You can't leave while payout history exists." />
          </p>
        )}
      </div>
    </div>
  );
}

function PayoutMethodSelector({
  method,
  address,
  onMethodChange,
  onAddressChange,
}: {
  method: SelectableMode;
  address: string;
  onMethodChange: (m: SelectableMode) => void;
  onAddressChange: (v: string) => void;
}) {
  const options: Array<{ value: SelectableMode; label: ReactNode }> = [
    {
      value: "lightning_address",
      label: <FormattedMessage defaultMessage="Lightning Address" />,
    },
    { value: "nwc", label: <FormattedMessage defaultMessage="NWC Wallet" /> },
    {
      value: "on_chain",
      label: <FormattedMessage defaultMessage="On-chain Address" />,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        className="grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-sm border border-cyber-border bg-cyber-border"
      >
        {options.map((o) => {
          const active = method === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onMethodChange(o.value)}
              className={
                active
                  ? "px-4 py-2 text-sm text-cyber-primary bg-cyber-primary/15"
                  : "px-4 py-2 text-sm text-cyber-muted bg-cyber-panel hover:text-cyber-text"
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {method === "lightning_address" && (
        <input
          type="text"
          placeholder="you@wallet.example"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
        />
      )}
      {method === "on_chain" && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="bc1…"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
          <p className="m-0 text-cyber-muted text-xs">
            <FormattedMessage defaultMessage="Payouts are batched with other on-chain referrers into one transaction once your balance clears the minimum. Your share of the network fee is deducted from your balance. Mainnet addresses only." />
          </p>
        </div>
      )}
      {method === "nwc" && (
        <div className="flex flex-col gap-2 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3">
          <p className="m-0 text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="Payouts go to a saved NWC wallet. Add or pick one below — the default enabled wallet is used." />
          </p>
          <PaymentMethods providerFilter="nwc" />
        </div>
      )}
    </div>
  );
}

function EarningChip({ earning }: { earning: ReferralEarning }) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 min-w-32">
      <div className="text-xl font-mono text-cyber-primary">
        <CostAmount
          cost={{ currency: earning.currency, amount: earning.amount }}
          converted={false}
        />
      </div>
      <div className="text-[0.65rem] uppercase tracking-widest text-cyber-muted">
        <FormattedMessage
          defaultMessage="earned · {currency}"
          values={{ currency: earning.currency }}
        />
      </div>
    </div>
  );
}

function UsageRow({ usage }: { usage: ReferralUsage }) {
  return (
    <tr>
      <td className="text-cyber-muted">
        <FormattedDate
          value={usage.created}
          year="numeric"
          month="short"
          day="numeric"
        />
      </td>
      <td className="text-right font-mono">
        <CostAmount
          cost={{ currency: usage.currency, amount: usage.amount }}
          converted={false}
        />
      </td>
      <td className="text-right font-mono text-cyber-muted">
        <FormattedNumber
          value={usage.effective_rate / 100}
          style="percent"
          maximumFractionDigits={2}
        />
      </td>
      <td className="text-right font-mono text-cyber-primary">
        <CostAmount
          cost={{ currency: usage.currency, amount: usage.commission }}
          converted={false}
        />
      </td>
    </tr>
  );
}

function PayoutRow({ payout }: { payout: ReferralPayout }) {
  // Batched on-chain payouts share a txid; link it for verification.
  const txid = payout.outpoint?.split(":")[0];
  return (
    <tr>
      <td className="text-cyber-muted">
        <FormattedDate
          value={payout.created}
          year="numeric"
          month="short"
          day="numeric"
          hour="2-digit"
          minute="2-digit"
        />
        {txid && (
          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-[0.65rem] text-cyber-accent"
          >
            {txid.slice(0, 8)}…{txid.slice(-8)}
          </a>
        )}
      </td>
      <td className="text-right font-mono">
        <CostAmount
          cost={{ currency: payout.currency, amount: payout.amount }}
          converted={false}
        />
        {(payout.fee ?? 0) > 0 && (
          <div className="text-[0.65rem] text-cyber-muted">
            <FormattedMessage
              defaultMessage="−{fee} fee"
              values={{
                fee: (
                  <CostAmount
                    cost={{ currency: payout.currency, amount: payout.fee! }}
                    converted={false}
                  />
                ),
              }}
            />
          </div>
        )}
      </td>
      <td className="text-right">
        {payout.is_paid ? (
          <span className="inline-block rounded-sm border border-cyber-border-bright bg-cyber-primary/15 px-2 py-0.5 text-xs uppercase tracking-wider text-cyber-primary">
            <FormattedMessage defaultMessage="Paid" />
          </span>
        ) : (
          <span className="inline-block rounded-sm border border-cyber-border bg-cyber-warning/15 px-2 py-0.5 text-xs uppercase tracking-wider text-cyber-warning">
            <FormattedMessage defaultMessage="Pending" />
          </span>
        )}
      </td>
    </tr>
  );
}
