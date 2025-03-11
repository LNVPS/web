import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PaymentMethod, VmInstance, VmPayment } from "../api";
import VpsPayment from "../components/vps-payment";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import CostLabel from "../components/cost";
import { RevolutPayWidget } from "../components/revolut";

export function VmBillingPage() {
  const location = useLocation() as { state?: VmInstance };
  const params = useParams();
  const login = useLogin();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Array<PaymentMethod>>();
  const [method, setMethod] = useState<PaymentMethod>();
  const [payment, setPayment] = useState<VmPayment>();
  const [state, setState] = useState<VmInstance | undefined>(location?.state);

  async function reloadVmState() {
    if (!state) return;
    const newState = await login?.api.getVm(state.id);
    setState(newState);
    setMethod(undefined);
    setMethods(undefined);
    return newState;
  }

  async function onPaid() {
    setMethod(undefined);
    setMethods(undefined);
    const s = reloadVmState();
    if (params["action"] === "renew") {
      navigate("/vm", { state: s });
    }
  }

  function paymentMethod(v: PaymentMethod) {
    const className =
      "flex items-center justify-between px-3 py-2 bg-neutral-900 rounded-xl cursor-pointer";

    switch (v.name) {
      case "lightning": {
        return (
          <div
            key={v.name}
            className={className}
            onClick={() => {
              setMethod(v);
              renew(v.name);
            }}
          >
            <div>
              {v.name.toUpperCase()} ({v.currencies.join(",")})
            </div>
            <div className="rounded-lg p-2 bg-green-800">Pay Now</div>
          </div>
        );
      }
      case "revolut": {
        const pkey = v.metadata?.["pubkey"];
        if (!pkey) return <b>Missing Revolut pubkey</b>;
        return (
          <div key={v.name} className={className}>
            <div>
              {v.name.toUpperCase()} ({v.currencies.join(",")})
            </div>
            {state && (
              <RevolutPayWidget
                mode={import.meta.env.VITE_REVOLUT_MODE}
                pubkey={pkey}
                amount={state.template.cost_plan}
                onPaid={() => {
                  onPaid();
                }}
                loadOrder={async () => {
                  if (!login?.api || !state) {
                    throw new Error("Not logged in");
                  }
                  const p = await login.api.renewVm(state.id, v.name);
                  return p.data.revolut!.token;
                }}
              />
            )}
          </div>
        );
      }
    }
  }

  const loadPaymentMethods = useCallback(
    async function () {
      if (!login?.api || !state) return;
      const p = await login?.api.getPaymentMethods();
      setMethods(p);
    },
    [login?.api, state],
  );

  const renew = useCallback(
    async function (m: string) {
      if (!login?.api || !state) return;
      const p = await login?.api.renewVm(state.id, m);
      setPayment(p);
    },
    [login?.api, state],
  );

  useEffect(() => {
    if (params["action"] === "renew" && login && state) {
      loadPaymentMethods();
    }
  }, [login, state, params, renew]);

  if (!state) return;
  const expireDate = new Date(state.expires);
  const days =
    (expireDate.getTime() - new Date().getTime()) / 1000 / 24 / 60 / 60;
  return (
    <div className="flex flex-col gap-4">
      <Link to={"/vm"} state={state}>
        &lt; Back
      </Link>
      <div className="text-xl bg-neutral-900 rounded-xl px-3 py-4 flex justify-between items-center">
        <div>Renewal for #{state.id}</div>
        <div>
          <CostLabel cost={state.template.cost_plan} />
          <span className="text-sm">ex. tax</span>
        </div>
      </div>
      {days > 0 && (
        <div>
          Expires: {expireDate.toDateString()} ({Math.floor(days)} days)
        </div>
      )}
      {days < 0 && !methods && (
        <div className="text-red-500 text-xl">Expired</div>
      )}
      {!methods && (
        <div>
          <AsyncButton onClick={loadPaymentMethods}>Extend Now</AsyncButton>
        </div>
      )}
      {methods && !method && (
        <>
          <div className="text-xl">Payment Method:</div>
          {methods.map((v) => paymentMethod(v))}
        </>
      )}
      {payment && (
        <>
          <h3>Renew VPS</h3>
          <VpsPayment
            payment={payment}
            onPaid={async () => {
              setPayment(undefined);
              onPaid();
            }}
          />
        </>
      )}
    </div>
  );
}
