import { useEffect, useState } from "react";
import { LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import { EventPublisher } from "@snort/system";
import { ApiUrl } from "../const";
import VpsInstanceRow from "../components/vps-instance";

export default function AccountPage() {
  const login = useLogin();
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  useEffect(() => {
    if (!login?.signer) return;
    const api = new LNVpsApi(
      ApiUrl,
      new EventPublisher(login.signer, login.pubkey),
    );
    api.listVms().then(setVms);
  }, [login]);

  return (
    <>
      <h3>My Resources</h3>
      <div className="flex flex-col gap-2">
        {vms.map((a) => (
          <VpsInstanceRow key={a.id} vm={a} />
        ))}
      </div>
    </>
  );
}
