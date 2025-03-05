import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { VmInstance, VmPayment } from "../api";
import VpsPayment from "../components/vps-payment";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import CostLabel from "../components/cost";

export function VmBillingPage() {
    const location = useLocation() as { state?: VmInstance };
    const params = useParams();
    const login = useLogin();
    const navigate = useNavigate();
    const [payment, setPayment] = useState<VmPayment>();
    const [state, setState] = useState<VmInstance | undefined>(location?.state);

    async function reloadVmState() {
        if (!state) return;
        const newState = await login?.api.getVm(state.id);
        setState(newState);
        return newState;
    }

    const renew = useCallback(
        async function () {
            if (!login?.api || !state) return;
            const p = await login?.api.renewVm(state.id);
            setPayment(p);
        },
        [login?.api, state],
    );

    useEffect(() => {
        if (params["action"] === "renew" && login && state) {
            renew()
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
                <CostLabel cost={state.template.cost_plan} />
            </div>
            {days > 0 && (
                <div>
                    Expires: {expireDate.toDateString()} ({Math.floor(days)} days)
                </div>
            )}
            {days < 0 && params["action"] !== "renew"
                && <div className="text-red-500 text-xl">Expired</div>}
            {!payment && (
                <div>
                    <AsyncButton onClick={renew}>Extend Now</AsyncButton>
                </div>
            )}
            {payment && (
                <>
                    <h3>Renew VPS</h3>
                    <VpsPayment
                        payment={payment}
                        onPaid={async () => {
                            setPayment(undefined);
                            if (!login?.api || !state) return;
                            const s = await reloadVmState();
                            if (params["action"] === "renew") {
                                navigate("/vm", { state: s });
                            }
                        }}
                    />
                </>
            )}
        </div>
    );
}
