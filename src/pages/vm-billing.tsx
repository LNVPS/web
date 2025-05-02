import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PaymentMethod, VmInstance, VmPayment } from "../api";
import VpsPayment from "../components/vps-payment";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import CostLabel, { CostAmount } from "../components/cost";
import { RevolutPayWidget } from "../components/revolut";
import { timeValue } from "../utils";
import { Icon } from "../components/icon";
import { ApiUrl } from "../const";
import QrCode from "../components/qr";
import { LNURL } from "@snort/shared";

export function VmBillingPage() {
  const location = useLocation() as { state?: VmInstance };
  const params = useParams();
  const login = useLogin();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Array<PaymentMethod>>();
  const [method, setMethod] = useState<PaymentMethod>();
  const [payment, setPayment] = useState<VmPayment>();
  const [payments, setPayments] = useState<Array<VmPayment>>([]);
  const [state, setState] = useState<VmInstance | undefined>(location?.state);

  async function listPayments() {
    if (!state) return;
    const history = await login?.api.listPayments(state.id);
    setPayments(history ?? []);
  }

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

    const nameRow = (v: PaymentMethod) => {
      return (
        <div>
          {v.name.toUpperCase()} ({v.currencies.join(",")})
        </div>
      );
    };
    switch (v.name) {
      case "lnurl": {
        const addr = v.metadata?.["address"];
        return (
          <div
            key={v.name}
            className={className}
            onClick={() => {
              setMethod(v);
            }}
          >
            {nameRow(v)}
            <div>{addr}</div>
          </div>
        );
      }
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
            {nameRow(v)}
            <div className="rounded-lg p-2 bg-green-800">Pay Now</div>
          </div>
        );
      }
      case "revolut": {
        const pkey = v.metadata?.["pubkey"];
        if (!pkey) return <b>Missing Revolut pubkey</b>;
        return (
          <div key={v.name} className={className}>
            {nameRow(v)}
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
    if (login && state) {
      listPayments();
    }
  }, [login, state, params, renew]);

  if (!state) return;
  const expireDate = new Date(state.expires);
  const days =
    (expireDate.getTime() - new Date().getTime()) / 1000 / 24 / 60 / 60;

  const lud16 = `${state.id}@${new URL(ApiUrl).host}`;
  // Static LNURL payment method
  const lnurl = {
    name: "lnurl",
    currencies: ["BTC"],
    metadata: {
      address: lud16,
    },
  } as PaymentMethod;

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
          {[lnurl, ...methods].map((v) => paymentMethod(v))}
        </>
      )}
      {method?.name === "lnurl" && (
        <>
          <div className="flex flex-col gap-4 rounded-xl p-3 bg-neutral-900 items-center">
            <QrCode
              data={`lightning:${new LNURL(lud16).lnurl}`}
              width={512}
              height={512}
              avatar="/logo.jpg"
              className="cursor-pointer rounded-xl overflow-hidden"
            />
            <div className="monospace select-all break-all text-center text-sm">
              {lud16}
            </div>
          </div>
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
      {!methods && (
        <>
          <div className="text-xl">Payment History</div>
          <table className="table bg-neutral-900 rounded-xl text-center">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments
                .sort(
                  (a, b) =>
                    new Date(b.created).getTime() -
                    new Date(a.created).getTime(),
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td className="pl-4">
                      {new Date(a.created).toLocaleString()}
                    </td>
                    <td>
                      <CostAmount
                        cost={{
                          amount:
                            (a.amount + a.tax) /
                            (a.currency === "BTC" ? 1e11 : 100),
                          currency: a.currency,
                        }}
                        converted={false}
                      />
                    </td>
                    <td>{timeValue(a.time)}</td>
                    <td>
                      {a.is_paid
                        ? "Paid"
                        : new Date(a.expires) <= new Date()
                          ? "Expired"
                          : "Unpaid"}
                    </td>
                    <td>
                      {a.is_paid && (
                        <div
                          title="Generate Invoice"
                          onClick={async () => {
                            const l = await login?.api.invoiceLink(a.id);
                            window.open(l, "_blank");
                          }}
                        >
                          <Icon name="printer" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
