import useLogin from "../hooks/login";
import { ReactNode, useEffect, useState } from "react";
import { AccountDetail, NotificationChannels } from "../api";
import { AsyncButton } from "../components/button";
import { default as iso } from "iso-3166-1";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

/** A bordered panel with an uppercase eyebrow, title and optional description. */
function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-cyber-border bg-cyber-panel/40">
      <header className="border-b border-cyber-border px-5 py-4">
        <div className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-primary">
          {eyebrow}
        </div>
        <h2 className="m-0 mt-1 text-lg text-cyber-text-bright">{title}</h2>
        {description && (
          <p className="mt-1 mb-0 text-sm text-cyber-muted">{description}</p>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Label + control pair, stacked on mobile and aligned in a grid on desktop. */
function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
      <span className="text-sm text-cyber-text">{label}</span>
      {children}
    </label>
  );
}

type ChipKind = "on" | "off" | "pending";

function StatusChip({ kind, label }: { kind: ChipKind; label: ReactNode }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[0.7rem] uppercase tracking-wider",
        {
          "border-cyber-primary/50 text-cyber-primary": kind === "on",
          "border-cyber-warning/50 text-cyber-warning": kind === "pending",
          "border-cyber-border text-cyber-muted": kind === "off",
        },
      )}
    >
      <span
        className={classNames("h-1.5 w-1.5 rounded-full", {
          "bg-cyber-primary shadow-neon-sm": kind === "on",
          "bg-cyber-warning": kind === "pending",
          "bg-cyber-muted": kind === "off",
        })}
      />
      {label}
    </span>
  );
}

/**
 * One notification channel rendered as a terminal-style status row: a toggle on
 * the left, the channel identity in the middle, and its connection state and
 * actions on the right.
 */
function ChannelRow({
  name,
  hint,
  status,
  toggle,
  children,
}: {
  name: ReactNode;
  hint: ReactNode;
  status: ReactNode;
  toggle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">{toggle}</div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-cyber-text-bright">{name}</div>
          <div className="text-xs text-cyber-muted">{hint}</div>
        </div>
        <div className="flex items-center gap-3">{status}</div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function AccountSettings() {
  const login = useLogin();
  const [acc, setAcc] = useState<AccountDetail>();
  const [channels, setChannels] = useState<NotificationChannels>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [waNumber, setWaNumber] = useState<string>("");
  const [waCode, setWaCode] = useState<string>("");
  const [waCodeSent, setWaCodeSent] = useState<boolean>(false);

  async function reloadAccount() {
    if (!login?.api) return;
    const newAcc = await login.api.getAccount();
    setAcc(newAcc);
  }

  useEffect(() => {
    login?.api.getAccount().then(setAcc);
    login?.api.notificationChannels().then(setChannels);
  }, [login]);

  if (!acc) return;

  const update = (patch: Partial<AccountDetail>) =>
    setAcc((s) => (s ? { ...s, ...patch } : undefined));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-2xl text-cyber-primary">
          <FormattedMessage defaultMessage="Account Settings" />
        </h1>
        <p className="mt-1 text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Manage your billing details, automatic renewal and how we reach you." />
        </p>
      </div>

      <SettingsSection
        eyebrow="Billing"
        title={<FormattedMessage defaultMessage="Billing Details" />}
        description={
          <FormattedMessage defaultMessage="Optional. Appears on the invoices we generate for your payments." />
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={<FormattedMessage defaultMessage="Name" />}>
            <input
              type="text"
              className="w-full"
              value={acc.name ?? ""}
              onChange={(e) => update({ name: e.target.value })}
            />
          </Field>
          <Field label={<FormattedMessage defaultMessage="Address Line 1" />}>
            <input
              type="text"
              className="w-full"
              value={acc.address_1 ?? ""}
              onChange={(e) => update({ address_1: e.target.value })}
            />
          </Field>
          <Field label={<FormattedMessage defaultMessage="Address Line 2" />}>
            <input
              type="text"
              className="w-full"
              value={acc.address_2 ?? ""}
              onChange={(e) => update({ address_2: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={<FormattedMessage defaultMessage="City" />}>
              <input
                type="text"
                className="w-full"
                value={acc.city ?? ""}
                onChange={(e) => update({ city: e.target.value })}
              />
            </Field>
            <Field label={<FormattedMessage defaultMessage="State" />}>
              <input
                type="text"
                className="w-full"
                value={acc.state ?? ""}
                onChange={(e) => update({ state: e.target.value })}
              />
            </Field>
            <Field label={<FormattedMessage defaultMessage="Postcode" />}>
              <input
                type="text"
                className="w-full"
                value={acc.postcode ?? ""}
                onChange={(e) => update({ postcode: e.target.value })}
              />
            </Field>
            <Field label={<FormattedMessage defaultMessage="Tax ID" />}>
              <input
                type="text"
                className="w-full"
                value={acc.tax_id ?? ""}
                onChange={(e) => update({ tax_id: e.target.value })}
              />
            </Field>
          </div>
          <Field label={<FormattedMessage defaultMessage="Country" />}>
            <select
              className="w-full"
              value={acc.country_code}
              onChange={(e) => update({ country_code: e.target.value })}
            >
              {iso.all().map((c) => (
                <option key={c.alpha3} value={c.alpha3}>
                  {c.country}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        eyebrow="Renewal"
        title={<FormattedMessage defaultMessage="Automatic Renewal" />}
        description={
          <FormattedMessage defaultMessage="Connect a Nostr Wallet Connect wallet to auto-pay renewals one day before a VM expires." />
        }
      >
        <Field
          label={<FormattedMessage defaultMessage="NWC Connection" />}
        >
          <input
            type="text"
            className="w-full"
            placeholder="nostr+walletconnect://..."
            value={acc.nwc_connection_string ?? ""}
            onChange={(e) => update({ nwc_connection_string: e.target.value })}
          />
        </Field>
      </SettingsSection>

      <SettingsSection
        eyebrow="Notifications"
        title={<FormattedMessage defaultMessage="How We Reach You" />}
        description={
          <FormattedMessage defaultMessage="Account alerts only, such as VM expiration. We never send marketing messages." />
        }
      >
        <div className="flex flex-col gap-3">
          {/* Email channel */}
          {(channels?.email ?? true) && (
            <ChannelRow
              name={<FormattedMessage defaultMessage="Email" />}
              hint={
                acc.email ? (
                  acc.email
                ) : (
                  <FormattedMessage defaultMessage="Add an email address below" />
                )
              }
              toggle={
                <input
                  type="checkbox"
                  aria-label="Enable email notifications"
                  checked={acc.contact_email}
                  onChange={(e) => update({ contact_email: e.target.checked })}
                />
              }
              status={
                acc.email_verified ? (
                  <StatusChip
                    kind="on"
                    label={<FormattedMessage defaultMessage="Verified" />}
                  />
                ) : acc.email ? (
                  <StatusChip
                    kind="pending"
                    label={<FormattedMessage defaultMessage="Unverified" />}
                  />
                ) : (
                  <StatusChip
                    kind="off"
                    label={<FormattedMessage defaultMessage="Not set" />}
                  />
                )
              }
            >
              <input
                type="email"
                className="w-full"
                placeholder="you@example.com"
                value={acc.email ?? ""}
                onChange={(e) => update({ email: e.target.value })}
              />
            </ChannelRow>
          )}

          {/* Nostr DM channel */}
          {(channels?.nip17 ?? true) && (
            <ChannelRow
              name={<FormattedMessage defaultMessage="Nostr DM" />}
              hint={
                <FormattedMessage defaultMessage="Encrypted NIP-17 direct message" />
              }
              toggle={
                <input
                  type="checkbox"
                  aria-label="Enable Nostr DM notifications"
                  checked={acc.contact_nip17}
                  onChange={(e) => update({ contact_nip17: e.target.checked })}
                />
              }
              status={
                <StatusChip
                  kind="on"
                  label={<FormattedMessage defaultMessage="Ready" />}
                />
              }
            />
          )}

          {/* Telegram channel */}
          {channels?.telegram && (
            <ChannelRow
              name={<FormattedMessage defaultMessage="Telegram" />}
              hint={
                acc.telegram_linked ? (
                  <FormattedMessage defaultMessage="Chat linked" />
                ) : (
                  <FormattedMessage defaultMessage="Link your chat, then press Start in the bot" />
                )
              }
              toggle={
                <input
                  type="checkbox"
                  aria-label="Enable Telegram notifications"
                  checked={acc.contact_telegram}
                  disabled={!acc.telegram_linked}
                  onChange={(e) =>
                    update({ contact_telegram: e.target.checked })
                  }
                />
              }
              status={
                <>
                  {acc.telegram_linked ? (
                    <StatusChip
                      kind="on"
                      label={<FormattedMessage defaultMessage="Linked" />}
                    />
                  ) : (
                    <StatusChip
                      kind="off"
                      label={<FormattedMessage defaultMessage="Not linked" />}
                    />
                  )}
                  {acc.telegram_linked ? (
                    <AsyncButton
                      className="text-sm"
                      onClick={async () => {
                        if (!login?.api) return;
                        setError(undefined);
                        try {
                          await login.api.telegramUnlink();
                          await reloadAccount();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Unlink" />
                    </AsyncButton>
                  ) : (
                    <AsyncButton
                      className="text-sm"
                      onClick={async () => {
                        if (!login?.api) return;
                        setError(undefined);
                        try {
                          const res = await login.api.telegramLink();
                          window.open(
                            res.url,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Link" />
                    </AsyncButton>
                  )}
                </>
              }
            />
          )}

          {/* WhatsApp channel */}
          {channels?.whatsapp && (
            <ChannelRow
              name={<FormattedMessage defaultMessage="WhatsApp" />}
              hint={
                acc.whatsapp_verified && acc.whatsapp_number ? (
                  acc.whatsapp_number
                ) : (
                  <FormattedMessage defaultMessage="Verify a phone number to enable" />
                )
              }
              toggle={
                <input
                  type="checkbox"
                  aria-label="Enable WhatsApp notifications"
                  checked={acc.contact_whatsapp}
                  disabled={!acc.whatsapp_verified}
                  onChange={(e) =>
                    update({ contact_whatsapp: e.target.checked })
                  }
                />
              }
              status={
                acc.whatsapp_verified ? (
                  <>
                    <StatusChip
                      kind="on"
                      label={<FormattedMessage defaultMessage="Verified" />}
                    />
                    <AsyncButton
                      className="text-sm"
                      onClick={async () => {
                        if (!login?.api) return;
                        setError(undefined);
                        try {
                          await login.api.whatsappUnlink();
                          setWaCodeSent(false);
                          setWaNumber("");
                          setWaCode("");
                          await reloadAccount();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Remove" />
                    </AsyncButton>
                  </>
                ) : (
                  <StatusChip
                    kind="off"
                    label={<FormattedMessage defaultMessage="Not verified" />}
                  />
                )
              }
            >
              {!acc.whatsapp_verified &&
                (!waCodeSent ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="tel"
                      className="flex-1 min-w-[12rem]"
                      placeholder="+15551234567"
                      value={waNumber}
                      onChange={(e) => setWaNumber(e.target.value)}
                    />
                    <AsyncButton
                      disabled={waNumber.trim().length === 0}
                      onClick={async () => {
                        if (!login?.api || waNumber.trim().length === 0) return;
                        setError(undefined);
                        try {
                          await login.api.whatsappVerify(waNumber.trim());
                          setWaCodeSent(true);
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Send Code" />
                    </AsyncButton>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="flex-1 min-w-[8rem]"
                      placeholder="000000"
                      value={waCode}
                      onChange={(e) => setWaCode(e.target.value)}
                    />
                    <AsyncButton
                      disabled={waCode.trim().length === 0}
                      onClick={async () => {
                        if (!login?.api || waCode.trim().length === 0) return;
                        setError(undefined);
                        try {
                          await login.api.whatsappConfirm(waCode.trim());
                          setWaCodeSent(false);
                          setWaCode("");
                          await reloadAccount();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Confirm" />
                    </AsyncButton>
                    <AsyncButton
                      onClick={async () => {
                        setWaCodeSent(false);
                        setWaCode("");
                      }}
                    >
                      <FormattedMessage defaultMessage="Cancel" />
                    </AsyncButton>
                  </div>
                ))}
            </ChannelRow>
          )}
        </div>
      </SettingsSection>

      <div className="flex items-center gap-4">
        <AsyncButton
          className="bg-cyber-primary/10 text-cyber-primary border-cyber-primary/50 hover:shadow-neon-sm"
          onClick={async () => {
            if (login?.api && acc) {
              setError(undefined);
              setSaved(false);
              try {
                await login.api.updateAccount(acc);
                await reloadAccount();
                setSaved(true);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }
          }}
        >
          <FormattedMessage defaultMessage="Save Changes" />
        </AsyncButton>
        {saved && !error && (
          <span className="text-sm text-cyber-primary">
            <FormattedMessage defaultMessage="Saved" />
          </span>
        )}
        {error && <span className="text-sm text-cyber-danger">{error}</span>}
      </div>
    </div>
  );
}
