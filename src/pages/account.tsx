import { useEffect, useState } from "react";
import { AccountDetail, LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import VpsInstanceRow from "../components/vps-instance";
import { hexToBech32 } from "@snort/shared";
import { Icon } from "../components/icon";
import { AsyncButton } from "../components/button";

export default function AccountPage() {
  const login = useLogin();
  const [acc, setAcc] = useState<AccountDetail>();
  const [editEmail, setEditEmail] = useState(false);
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  async function loadVms(api: LNVpsApi) {
    const vms = await api.listVms();
    setVms(vms);
  }

  useEffect(() => {
    if (login?.api) {
      loadVms(login.api);
      login.api.getAccount().then(setAcc);
      const t = setInterval(() => {
        loadVms(login.api);
      }, 5_000);
      return () => clearInterval(t);
    }
  }, [login]);

  function notifications() {
    return <>
      <h3>Notification Settings</h3>
      <div className="flex gap-2 items-center">
        <input type="checkbox" checked={acc?.contact_email ?? false} onChange={(e) => {
          setAcc((s) => (s ? { ...s, contact_email: e.target.checked } : undefined));
        }} />
        Email
        <input type="checkbox" checked={acc?.contact_nip17 ?? false} onChange={(e) => {
          setAcc((s) => (s ? { ...s, contact_nip17: e.target.checked } : undefined));
        }} />
        Nostr DM
      </div>
      <div className="flex gap-2 items-center">
        <h4>Email</h4>
        <input type="text" disabled={!editEmail} value={acc?.email} onChange={e => setAcc(s => (s ? { ...s, email: e.target.value } : undefined))} />
        {!editEmail && <Icon name="pencil" onClick={() => setEditEmail(true)} />}
      </div>
      <div>
        <AsyncButton onClick={async () => {
          if (login?.api && acc) {
            await login.api.updateAccount(acc);
            const newAcc = await login.api.getAccount();
            setAcc(newAcc);
            setEditEmail(false);
          }
        }}>
          Save
        </AsyncButton>
      </div>
    </>
  }

  const npub = hexToBech32("npub", login?.publicKey);
  const subjectLine = `[${npub}] Account Query`;
  return (
    <div className="flex flex-col gap-2">
      Your Public Key:
      <pre className="bg-neutral-900 rounded-md px-3 py-2 select-all text-sm">{npub}</pre>
      {notifications()}
      <h3>My Resources</h3>
      <div className="rounded-xl bg-red-400 text-black p-3">
        Something doesnt look right? <br />
        Please contact support on: {" "}
        <a href={`mailto:sales@lnvps.net?subject=${encodeURIComponent(subjectLine)}`} className="underline">
          sales@lnvps.net
        </a>
        <br />
        <b>Please include your public key in all communications.</b>
      </div>
      {vms.map((a) => (
        <VpsInstanceRow key={a.id} vm={a} onReload={() => {
          if (login?.api) {
            loadVms(login.api);
          }
        }} />
      ))}

    </div>
  );
}
