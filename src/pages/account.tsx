import { useEffect, useState } from "react";
import { VmInstance } from "../api";
import useLogin from "../hooks/login";
import VpsInstanceRow from "../components/vps-instance";
import { hexToBech32 } from "@snort/shared";

export default function AccountPage() {
  const login = useLogin();
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  async function loadVms() {
    if (!login?.api) return;
    const vms = await login?.api.listVms();
    setVms(vms);
  }

  useEffect(() => {
    loadVms();
    const t = setInterval(() => loadVms(), 5_000);
    return () => clearInterval(t);
  }, [login]);

  const npub = hexToBech32("npub", login?.publicKey);
  return (
    <>
      <div className="flex flex-col gap-2">
        Your Public Key:
        <pre className="bg-neutral-800 rounded-md px-3 py-2 select-all text-sm">{npub}</pre>
      </div>
      <h3>My Resources</h3>
      <div className="rounded-xl bg-red-400 text-black p-3 font-bold">
        Something doesnt look right? <br />
        Please contact support on: {" "}
        <a href={`mailto:sales@lnvps.net?subject=[${npub}]%20Account%20Query`} className="underline">
          sales@lnvps.net
        </a>
      </div>
      <div className="flex flex-col gap-2">
        {vms.map((a) => (
          <VpsInstanceRow key={a.id} vm={a} onReload={loadVms} />
        ))}
      </div>
    </>
  );
}
