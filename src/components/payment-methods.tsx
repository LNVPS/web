import { useCallback, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import useLogin from "../hooks/login";
import { SavedPaymentMethod } from "../api";
import { AsyncButton } from "./button";

/** Default (provider-derived) label for a saved payment method. */
function defaultLabel(m: SavedPaymentMethod): string {
  if (m.provider === "nwc") return "Lightning Wallet (NWC)";
  if (m.provider === "revolut") {
    const brand = m.card_brand ?? "Card";
    const last4 = m.card_last_four ? ` •••• ${m.card_last_four}` : "";
    return `${brand}${last4}`;
  }
  return m.provider;
}

function expiryLabel(m: SavedPaymentMethod): string | undefined {
  if (m.exp_month && m.exp_year) {
    const mm = String(m.exp_month).padStart(2, "0");
    return `${mm}/${String(m.exp_year).slice(-2)}`;
  }
  return undefined;
}

function isExpired(m: SavedPaymentMethod): boolean {
  if (!m.exp_month || !m.exp_year) return false;
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  return m.exp_year < y || (m.exp_year === y && m.exp_month < mo);
}

/**
 * Manage saved payment methods used for automatic renewals: list, choose the
 * default, enable/disable, delete, and add a Nostr Wallet Connect wallet.
 */
export function PaymentMethods() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [nwc, setNwc] = useState("");
  const [nwcName, setNwcName] = useState("");
  const [editingId, setEditingId] = useState<number>();
  const [editingName, setEditingName] = useState("");

  const reload = useCallback(async () => {
    if (!login?.api) return;
    setLoading(true);
    try {
      setMethods(await login.api.listPaymentMethods());
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [login?.api]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function setDefault(id: number) {
    if (!login?.api) return;
    await login.api.updatePaymentMethod(id, { is_default: true });
    await reload();
  }

  async function toggleEnabled(m: SavedPaymentMethod) {
    if (!login?.api) return;
    await login.api.updatePaymentMethod(m.id, { enabled: !m.enabled });
    await reload();
  }

  async function remove(id: number) {
    if (!login?.api) return;
    await login.api.deletePaymentMethod(id);
    await reload();
  }

  async function addNwc() {
    if (!login?.api) return;
    const value = nwc.trim();
    if (!value) return;
    try {
      await login.api.addNwcPaymentMethod(value, nwcName.trim() || undefined);
      setNwc("");
      setNwcName("");
      setError(undefined);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveName(id: number) {
    if (!login?.api) return;
    await login.api.updatePaymentMethod(id, { name: editingName.trim() || null });
    setEditingId(undefined);
    setEditingName("");
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="text-cyber-danger text-sm">{error}</div>}

      {loading ? (
        <div className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Loading…" />
        </div>
      ) : methods.length === 0 ? (
        <div className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="No saved payment methods yet." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {methods.map((m) => {
            const expired = isExpired(m);
            const exp = expiryLabel(m);
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-cyber-border bg-cyber-panel-light px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-cyber-text-bright">
                      {m.name?.trim() || defaultLabel(m)}
                    </span>
                    {m.is_default && (
                      <span className="rounded-sm bg-cyber-primary/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-cyber-primary">
                        <FormattedMessage defaultMessage="Default" />
                      </span>
                    )}
                    {!m.enabled && (
                      <span className="rounded-sm bg-cyber-border px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-cyber-muted">
                        <FormattedMessage defaultMessage="Disabled" />
                      </span>
                    )}
                    {expired && (
                      <span className="rounded-sm bg-cyber-danger/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-cyber-danger">
                        <FormattedMessage defaultMessage="Expired" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-cyber-muted">
                    {/* Show the derived label as a subtitle when a custom name is set */}
                    {m.name?.trim() ? `${defaultLabel(m)}` : null}
                    {m.name?.trim() && exp ? " · " : null}
                    {exp ? (
                      <FormattedMessage
                        defaultMessage="Expires {exp}"
                        values={{ exp }}
                      />
                    ) : null}
                  </span>
                  {editingId === m.id && (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        className="text-sm"
                        placeholder={formatMessage({
                          defaultMessage: "Label (e.g. Personal Visa)",
                        })}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                      />
                      <AsyncButton
                        className="text-xs"
                        onClick={() => saveName(m.id)}
                      >
                        <FormattedMessage defaultMessage="Save" />
                      </AsyncButton>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AsyncButton
                    className="text-xs"
                    onClick={() => {
                      setEditingId(editingId === m.id ? undefined : m.id);
                      setEditingName(m.name ?? "");
                    }}
                  >
                    <FormattedMessage defaultMessage="Rename" />
                  </AsyncButton>
                  {!m.is_default && m.enabled && !expired && (
                    <AsyncButton
                      className="text-xs"
                      onClick={() => setDefault(m.id)}
                    >
                      <FormattedMessage defaultMessage="Set default" />
                    </AsyncButton>
                  )}
                  <AsyncButton
                    className="text-xs"
                    onClick={() => toggleEnabled(m)}
                  >
                    {m.enabled ? (
                      <FormattedMessage defaultMessage="Disable" />
                    ) : (
                      <FormattedMessage defaultMessage="Enable" />
                    )}
                  </AsyncButton>
                  <AsyncButton className="text-xs" onClick={() => remove(m.id)}>
                    <FormattedMessage defaultMessage="Remove" />
                  </AsyncButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-cyber-border pt-4">
        <label className="text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Add a Nostr Wallet Connect wallet" />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            className="w-full"
            placeholder="nostr+walletconnect://..."
            value={nwc}
            onChange={(e) => setNwc(e.target.value)}
          />
          <input
            type="text"
            className="w-full sm:w-48"
            placeholder={formatMessage({ defaultMessage: "Label (optional)" })}
            value={nwcName}
            onChange={(e) => setNwcName(e.target.value)}
          />
          <AsyncButton onClick={addNwc} disabled={!nwc.trim()}>
            <FormattedMessage defaultMessage="Add" />
          </AsyncButton>
        </div>
        <p className="m-0 text-xs text-cyber-muted">
          {formatMessage({
            defaultMessage:
              "Cards are saved automatically when you pay with Revolut and automatic renewal is enabled.",
          })}
        </p>
      </div>
    </div>
  );
}
