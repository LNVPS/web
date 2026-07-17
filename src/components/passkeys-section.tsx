import { useEffect, useState } from "react";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import useLogin from "../hooks/login";
import { Passkey } from "../api";
import { AsyncButton } from "./button";
import PasskeyIcon from "./passkey-icon";
import { addPasskey, browserSupportsWebAuthn, isWebauthnCancellation } from "../webauthn";

/**
 * Manage the passkeys registered to the current account: list, add and remove.
 * Any account type can add passkeys; a pure passkey account can't remove its
 * last one (that would lock it out), so deletion of the final credential is
 * disabled for `webauthn` accounts.
 */
export default function PasskeysSection({
  accountType,
}: {
  accountType?: "nostr" | "oauth" | "webauthn";
}) {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const [passkeys, setPasskeys] = useState<Array<Passkey>>();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const supported = browserSupportsWebAuthn();

  async function reload() {
    if (!login?.api) return;
    setPasskeys(await login.api.listPasskeys());
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login]);

  async function onAdd() {
    if (!login?.api) return;
    setError(undefined);
    try {
      await addPasskey(login.api, name.trim() || undefined);
      setName("");
      await reload();
    } catch (e) {
      if (isWebauthnCancellation(e)) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onDelete(id: number) {
    if (!login?.api) return;
    setError(undefined);
    try {
      await login.api.deletePasskey(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-cyber-muted">
        <FormattedMessage defaultMessage="This browser doesn't support passkeys." />
      </p>
    );
  }

  // A pure passkey account must keep at least one credential.
  const lockedLast = accountType === "webauthn" && (passkeys?.length ?? 0) <= 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {passkeys === undefined ? (
          <p className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="Loading…" />
          </p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="No passkeys yet. Add one to sign in without a key." />
          </p>
        ) : (
          passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex flex-wrap items-center gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3"
            >
              <span className="text-cyber-primary">
                <PasskeyIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-cyber-text-bright truncate">
                  {pk.name || (
                    <FormattedMessage defaultMessage="Unnamed passkey" />
                  )}
                </div>
                <div className="text-xs text-cyber-muted">
                  <FormattedMessage
                    defaultMessage="Added {date}"
                    values={{
                      date: (
                        <FormattedDate
                          value={pk.created}
                          year="numeric"
                          month="short"
                          day="numeric"
                        />
                      ),
                    }}
                  />
                  {pk.last_used && (
                    <>
                      {" · "}
                      <FormattedMessage
                        defaultMessage="last used {date}"
                        values={{
                          date: (
                            <FormattedDate
                              value={pk.last_used}
                              year="numeric"
                              month="short"
                              day="numeric"
                            />
                          ),
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
              <AsyncButton
                className="text-sm"
                disabled={lockedLast}
                title={
                  lockedLast
                    ? formatMessage({
                        defaultMessage:
                          "You can't remove your only passkey on a passkey-only account.",
                      })
                    : undefined
                }
                onClick={() => onDelete(pk.id)}
              >
                <FormattedMessage defaultMessage="Remove" />
              </AsyncButton>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="flex-1 min-w-[12rem]"
          placeholder={formatMessage({
            defaultMessage: "Passkey name (e.g. MacBook)",
          })}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AsyncButton onClick={onAdd}>
          <span className="inline-flex items-center gap-2">
            <PasskeyIcon />
            <FormattedMessage defaultMessage="Add passkey" />
          </span>
        </AsyncButton>
      </div>

      {error && <span className="text-sm text-cyber-danger">{error}</span>}
    </div>
  );
}
