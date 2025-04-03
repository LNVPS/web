import { useEffect, useState } from "react";
import { LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import VpsInstanceRow from "../components/vps-instance";
import { hexToBech32 } from "@snort/shared";
import { AsyncButton } from "../components/button";
import { useNavigate } from "react-router-dom";
import { AccountNostrDomains } from "../components/account-domains";

export default function AccountPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  async function loadVms(api: LNVpsApi) {
    const vms = await api.listVms();
    setVms(vms);
  }

  useEffect(() => {
    if (login?.api) {
      loadVms(login.api);
      const t = setInterval(() => {
        loadVms(login.api);
      }, 5_000);
      return () => clearInterval(t);
    }
  }, [login]);

  const npub = hexToBech32("npub", login?.publicKey);
  const subjectLine = `[${npub}] Account Query`;
  return (
    <div className="flex flex-col gap-2">
      Your Public Key:
      <pre className="bg-neutral-900 rounded-md px-3 py-2 select-all text-sm">
        {npub}
      </pre>
      <div className="flex justify-between">
        <AsyncButton onClick={() => navigate("settings")}>Settings</AsyncButton>
        <AsyncButton
          onClick={() => {
            login?.logout();
            navigate("/");
          }}
        >
          Logout
        </AsyncButton>
      </div>
      <h3>My Resources</h3>
      <div className="rounded-xl bg-red-400 text-black p-3">
        Something doesnt look right? <br />
        Please contact support on:{" "}
        <a
          href={`mailto:sales@lnvps.net?subject=${encodeURIComponent(subjectLine)}`}
          className="underline"
        >
          sales@lnvps.net
        </a>
        <br />
        <b>Please include your public key in all communications.</b>
      </div>
      {vms.length > 0 && <h3>VPS</h3>}
      {vms.map((a) => (
        <VpsInstanceRow
          key={a.id}
          vm={a}
          onReload={() => {
            if (login?.api) {
              loadVms(login.api);
            }
          }}
        />
      ))}
      <AccountNostrDomains />
    </div>
  );
}
