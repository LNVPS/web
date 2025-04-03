import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import { AccountDetail } from "../api";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";
import { default as iso } from "iso-3166-1";

export function AccountSettings() {
  const login = useLogin();
  const [acc, setAcc] = useState<AccountDetail>();
  const [editEmail, setEditEmail] = useState(false);

  useEffect(() => {
    login?.api.getAccount().then(setAcc);
  }, [login]);

  if (!acc) return;
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Account Settings</div>

      <div className="flex gap-2 items-center">
        <h4>Country</h4>
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
      </div>

      <div className="text-xl">Notification Settings</div>
      <p className="text-neutral-400 text-sm">
        This is only for account notifications such as VM expiration
        notifications, we do not send marketing or promotional messages.
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
        Email
        <input
          type="checkbox"
          checked={acc?.contact_nip17 ?? false}
          onChange={(e) => {
            setAcc((s) =>
              s ? { ...s, contact_nip17: e.target.checked } : undefined,
            );
          }}
        />
        Nostr DM
      </div>
      <div className="flex gap-2 items-center">
        <h4>Email</h4>
        <input
          type="text"
          disabled={!editEmail}
          value={acc?.email}
          onChange={(e) =>
            setAcc((s) => (s ? { ...s, email: e.target.value } : undefined))
          }
        />
        {!editEmail && (
          <Icon name="pencil" onClick={() => setEditEmail(true)} />
        )}
      </div>
      <div>
        <AsyncButton
          onClick={async () => {
            if (login?.api && acc) {
              await login.api.updateAccount(acc);
              const newAcc = await login.api.getAccount();
              setAcc(newAcc);
              setEditEmail(false);
            }
          }}
        >
          Save
        </AsyncButton>
      </div>
    </div>
  );
}
