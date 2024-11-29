import { useEffect, useState } from "react";
import { LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import { EventPublisher } from "@snort/system";
import { ApiUrl } from "../const";
import VpsInstanceRow from "../components/vps-instance";

export default function AccountPage() {
  const login = useLogin();
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  async function loadVms() {
    if (!login?.signer) return;
    const api = new LNVpsApi(
      ApiUrl,
      new EventPublisher(login.signer, login.pubkey),
    );
    const vms = await api.listVms();
    setVms(vms);
  }

  useEffect(() => {
    loadVms();
    const t = setInterval(() => loadVms(), 5_000);
    return () => clearInterval(t);
  }, [login]);

  return (
    <>
      <h3>My Resources</h3>
      <div className="flex flex-col gap-2">
        {vms.map((a) => (
          <VpsInstanceRow key={a.id} vm={a} onReload={loadVms} />
        ))}
      </div>
    </>
  );
}
