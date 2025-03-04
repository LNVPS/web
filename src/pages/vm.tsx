import "@xterm/xterm/css/xterm.css";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { VmInstance, VmIpAssignment, VmPayment } from "../api";
import VpsInstanceRow from "../components/vps-instance";
import useLogin from "../hooks/login";
import { useCallback, useEffect, useRef, useState } from "react";
import VpsPayment from "../components/vps-payment";
import CostLabel from "../components/cost";
import { AsyncButton } from "../components/button";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { toEui64 } from "../utils";
import { Icon } from "../components/icon";
import Modal from "../components/modal";
import SSHKeySelector from "../components/ssh-keys";

const fit = new FitAddon();

export default function VmPage() {
  const { state } = useLocation() as { state?: VmInstance };
  const { action } = useParams();
  const login = useLogin();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<VmPayment>();
  const [term] = useState<Terminal>();
  const termRef = useRef<HTMLDivElement | null>(null);
  const [editKey, setEditKey] = useState(false);
  const [editReverse, setEditReverse] = useState<VmIpAssignment>();
  const [error, setError] = useState<string>();
  const [key, setKey] = useState(state?.ssh_key.id ?? -1);

  const renew = useCallback(
    async function () {
      if (!login?.api || !state) return;
      const p = await login?.api.renewVm(state.id);
      setPayment(p);
    },
    [login?.api, state],
  );

  /*async function openTerminal() {
    if (!login?.api || !state) return;
    const ws = await login.api.connect_terminal(state.id);
    const te = new Terminal();
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      webgl.dispose();
    });
    te.loadAddon(webgl);
    te.loadAddon(fit);
    te.onResize(({ cols, rows }) => {
      ws.send(`${cols}:${rows}`);
    });
    const attach = new AttachAddon(ws);
    te.loadAddon(attach);
    setTerm(te);
  }*/

  useEffect(() => {
    if (term && termRef.current) {
      term.open(termRef.current);
      term.focus();
      fit.fit();
    }
  }, [termRef, term, fit]);

  useEffect(() => {
    switch (action) {
      case "renew":
        renew();
    }
  }, [renew, action]);

  if (!state) {
    return <h2>No VM selected</h2>;
  }

  function ipRow(a: VmIpAssignment, reverse: boolean) {
    return <div
      key={a.id}
      className="bg-neutral-900 px-2 py-3 rounded-lg flex gap-2 flex-col justify-center"
    >
      <div>
        <span>IP: </span>
        <span className="select-all">{a.ip.split("/")[0]}</span>
        {a.forward_dns && <span> ({a.forward_dns})</span>}
      </div>
      {reverse && <div className="text-sm flex items-center gap-2">
        <div>PTR: {a.reverse_dns}</div>
        <Icon name="pencil" className="inline" size={15} onClick={() => setEditReverse(a)} />
      </div>}
    </div>
  }

  function networkInfo() {
    if (!state) return;
    if ((state.ip_assignments?.length ?? 0) === 0) {
      return <div className="text-sm text-red-500">No IP's assigned</div>
    }
    return <>
      {state.ip_assignments?.map(i => ipRow(i, true))}
      {ipRow({
        id: -1,
        ip: toEui64("2a13:2c0::", state.mac_address),
        gateway: ""
      }, false)}
    </>
  }

  return (
    <div className="flex flex-col gap-4">
      <VpsInstanceRow vm={state} actions={true} />
      {action === undefined && (
        <>
          <div className="text-xl">Network:</div>
          <div className="grid grid-cols-2 gap-4">
            {networkInfo()}
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-xl">SSH Key:</div>
            <div className="text-sm bg-neutral-900 px-3 py-1 rounded-lg">
              {state.ssh_key?.name}
            </div>
            <Icon name="pencil" onClick={() => setEditKey(true)} />
          </div>
          <hr />
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
          {/*
          {!term && <AsyncButton onClick={openTerminal}>Connect Terminal</AsyncButton>}
          {term && <div className="border p-2" ref={termRef}></div>}*/}
        </>
      )}
      {action === "renew" && (
        <>
          <h3>Renew VPS</h3>
          {payment && (
            <VpsPayment
              payment={payment}
              onPaid={async () => {
                if (!login?.api || !state) return;
                const newState = await login?.api.getVm(state.id);
                navigate("/vm", {
                  state: newState,
                });
                setPayment(undefined);
              }}
            />
          )}
        </>
      )}
      {editKey && (
        <Modal id="edit-ssh-key" onClose={() => setEditKey(false)}>
          <SSHKeySelector selectedKey={key} setSelectedKey={setKey} />
          <div className="flex flex-col gap-4 mt-8">
            <small>After selecting a new key, please restart the VM.</small>
            {error && <b className="text-red-700">{error}</b>}
            <AsyncButton
              onClick={async () => {
                setError(undefined);
                if (!login?.api) return;
                try {
                  await login.api.patchVm(state.id, {
                    ssh_key_id: key,
                  });
                  const ns = await login.api.getVm(state?.id);
                  navigate(".", {
                    state: ns,
                    replace: true,
                  });
                  setEditKey(false);
                } catch (e) {
                  if (e instanceof Error) {
                    setError(e.message);
                  }
                }
              }}
            >
              Save
            </AsyncButton>
          </div>
        </Modal>
      )}
      {editReverse && (
        <Modal id="edit-reverse" onClose={() => setEditReverse(undefined)}>

          <div className="flex flex-col gap-4">
            <div className="text-lg">Reverse DNS:</div>
            <input type="text" placeholder="my-domain.com" value={editReverse.reverse_dns} onChange={(e) => setEditReverse({
              ...editReverse,
              reverse_dns: e.target.value
            })} />
            <small>DNS updates can take up to 48hrs to propagate.</small>
            {error && <b className="text-red-700">{error}</b>}
            <AsyncButton
              onClick={async () => {
                setError(undefined);
                if (!login?.api) return;

                try {
                  await login.api.patchVm(state.id, {
                    reverse_dns: editReverse.reverse_dns,
                  });

                  const ns = await login.api.getVm(state?.id);
                  navigate(".", {
                    state: ns,
                    replace: true,
                  });
                  setEditReverse(undefined);
                } catch (e) {
                  if (e instanceof Error) {
                    setError(e.message);
                  }
                }
              }}
            >
              Save
            </AsyncButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
