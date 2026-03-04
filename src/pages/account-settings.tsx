import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import { AccountDetail } from "../api";
import { AsyncButton } from "../components/button";
import { default as iso } from "iso-3166-1";
import { FormattedMessage } from "react-intl";

export function AccountSettings() {
  const login = useLogin();
  const [acc, setAcc] = useState<AccountDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    login?.api.getAccount().then(setAcc);
  }, [login]);

  if (!acc) return;
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Account Settings" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Update your billing information to appear on generated invoices (optional)." />
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 items-center">
        <div>
          <FormattedMessage defaultMessage="Name" />
        </div>
        <input
          type="text"
          value={acc.name}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, name: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="Address Line 1" />
        </div>
        <input
          type="text"
          value={acc.address_1}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, address_1: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="Address Line 2" />
        </div>
        <input
          type="text"
          value={acc.address_2}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, address_2: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="City" />
        </div>
        <input
          type="text"
          value={acc.city}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, city: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="State" />
        </div>
        <input
          type="text"
          value={acc.state}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, state: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="Postcode" />
        </div>
        <input
          type="text"
          value={acc.postcode}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, postcode: e.target.value } : undefined))
          }
        />
        <div>
          <FormattedMessage defaultMessage="Country" />
        </div>
        <select
          value={acc?.country_code}
          onChange={(e) =>
            setAcc((s) =>
              s ? { ...s, country_code: e.target.value } : undefined,
            )
          }
        >
          {iso.all().map((c) => (
            <option value={c.alpha3}>{c.country}</option>
          ))}
        </select>
        <div>
          <FormattedMessage defaultMessage="Tax ID" />
        </div>
        <input
          type="text"
          value={acc.tax_id}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, tax_id: e.target.value } : undefined))
          }
        />
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 items-center">
        <div>
          <FormattedMessage defaultMessage="Email" />
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="email"
            value={acc?.email ?? ""}
            onChange={(e) =>
              setAcc((s) => (s ? { ...s, email: e.target.value } : undefined))
            }
          />
          {acc?.email_verified && (
            <span className="text-green-500 text-sm">
              <FormattedMessage defaultMessage="Verified" />
            </span>
          )}
        </div>
      </div>
      <div className="text-xl">
        <FormattedMessage defaultMessage="Automatic Renewal" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Configure automatic VM renewal using Nostr Wallet Connect. Your wallet will automatically pay for VM renewals 1 day before expiration." />
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 items-center">
        <div>
          <FormattedMessage defaultMessage="NWC Connection String" />
        </div>
        <input
          type="text"
          placeholder="nostr+walletconnect://..."
          value={acc.nwc_connection_string ?? ""}
          onChange={(e) =>
            setAcc((s) =>
              s ? { ...s, nwc_connection_string: e.target.value } : undefined,
            )
          }
        />
      </div>
      <div className="text-xl">
        <FormattedMessage defaultMessage="Notification Settings" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="This is only for account notifications such as VM expiration notifications, we do not send marketing or promotional messages." />
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="checkbox"
          checked={acc?.contact_email ?? false}
          onChange={(e) => {
            setAcc((s) =>
              s ? { ...s, contact_email: e.target.checked } : undefined,
            );
          }}
        />
        <FormattedMessage defaultMessage="Email" />
        <input
          type="checkbox"
          checked={acc?.contact_nip17 ?? false}
          onChange={(e) => {
            setAcc((s) =>
              s ? { ...s, contact_nip17: e.target.checked } : undefined,
            );
          }}
        />
        <FormattedMessage defaultMessage="Nostr DM" />
      </div>
      <div>
        <AsyncButton
          onClick={async () => {
            if (login?.api && acc) {
              setError(undefined);
              try {
                await login.api.updateAccount(acc);
                const newAcc = await login.api.getAccount();
                setAcc(newAcc);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }
          }}
        >
          <FormattedMessage defaultMessage="Save" />
        </AsyncButton>
      </div>
      {error && <b className="text-cyber-danger">{error}</b>}
    </div>
  );
}
