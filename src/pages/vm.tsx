import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LNVpsApi, VmInstance, VmPayment } from "../api";
import VpsInstanceRow from "../components/vps-instance";
import useLogin from "../hooks/login";
import { ApiUrl } from "../const";
import { EventPublisher } from "@snort/system";
import { useCallback, useEffect, useState } from "react";
import VpsPayment from "../components/vps-payment";
import CostLabel from "../components/cost";
import { AsyncButton } from "../components/button";

export default function VmPage() {
  const { state } = useLocation() as { state?: VmInstance };
  const { action } = useParams();
  const login = useLogin();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<VmPayment>();

  const renew = useCallback(
    async function () {
      if (!login?.signer || !state) return;
      const api = new LNVpsApi(
        ApiUrl,
        new EventPublisher(login.signer, login.pubkey),
      );
      const p = await api.renewVm(state.id);
      setPayment(p);
    },
    [login, state],
  );

  useEffect(() => {
    switch (action) {
      case "renew":
        renew();
    }
  }, [renew, action]);

  if (!state) {
    return <h2>No VM selected</h2>;
  }
  return (
    <div className="flex flex-col gap-4">
      <VpsInstanceRow vm={state} actions={false} />
      {action === undefined && (
        <>
          <div className="text-xl">Renewal</div>
          <div className="flex justify-between items-center">
            <div>{new Date(state.expires).toDateString()}</div>
            {state.template?.cost_plan && (
              <div>
                <CostLabel cost={state.template?.cost_plan} />
              </div>
            )}
          </div>
          <AsyncButton onClick={() => navigate("/vm/renew", { state })}>
            Extend Now
          </AsyncButton>
          <div className="text-xl">Network</div>
          <div className="flex gap-4">
            {(state.ip_assignments?.length ?? 0) === 0 && (
              <div className="text-sm text-red-500">No IP's assigned</div>
            )}
            {state.ip_assignments?.map((a) => (
              <div
                key={a.id}
                className="text-sm bg-neutral-900 px-3 py-1 rounded-lg"
              >
                {a.ip.split("/")[0]}
              </div>
            ))}
          </div>
        </>
      )}
      {action === "renew" && (
        <>
          <h3>Renew VPS</h3>
          {payment && (
            <VpsPayment
              payment={payment}
              onPaid={async () => {
                if (!login?.signer || !state) return;
                const api = new LNVpsApi(
                  ApiUrl,
                  new EventPublisher(login.signer, login.pubkey),
                );
                const newState = await api.getVm(state.id);
                navigate("/vm", {
                  state: newState,
                });
                setPayment(undefined);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
