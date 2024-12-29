import "@xterm/xterm/css/xterm.css";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LNVpsApi, VmInstance, VmPayment } from "../api";
import VpsInstanceRow from "../components/vps-instance";
import useLogin from "../hooks/login";
import { ApiUrl } from "../const";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VpsPayment from "../components/vps-payment";
import CostLabel from "../components/cost";
import { AsyncButton } from "../components/button";
import { AttachAddon } from "@xterm/addon-attach";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
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
  const [term, setTerm] = useState<Terminal>();
  const termRef = useRef<HTMLDivElement | null>(null);
  const [editKey, setEditKey] = useState(false);
  const [key, setKey] = useState(state?.ssh_key_id ?? -1);

  const api = useMemo(() => {
    if (!login?.builder) return;
    return new LNVpsApi(ApiUrl, login.builder);
  }, [login]);

  const renew = useCallback(
    async function () {
      if (!api || !state) return;
      const p = await api.renewVm(state.id);
      setPayment(p);
    },
    [api, state],
  );

  async function openTerminal() {
    if (!login?.builder || !state) return;
    const api = new LNVpsApi(ApiUrl, login.builder);
    const ws = await api.connect_terminal(state.id);
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
  }

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
  return (
    <div className="flex flex-col gap-4">
      <VpsInstanceRow vm={state} actions={true} />
      {action === undefined && (
        <>
          <div className="flex gap-4 items-center">
            <div className="text-xl">Network:</div>
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
            <div className="text-sm bg-neutral-900 px-3 py-1 rounded-lg">
              {toEui64("2a13:2c0::", state.mac_address)}
            </div>
          </div>
          <div className="flex gap-4 items-center">
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
                if (!login?.builder || !state) return;
                const api = new LNVpsApi(ApiUrl, login.builder);
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
      {editKey && (
        <Modal id="edit-ssh-key" onClose={() => setEditKey(false)}>
          <SSHKeySelector selectedKey={key} setSelectedKey={setKey} />
          <div className="flex flex-col gap-4 mt-8">
            <small>After selecting a new key, please restart the VM.</small>
            <AsyncButton
              onClick={async () => {
                if (!state) return;
                await api?.patchVm(state.id, {
                  ssh_key_id: key,
                });
                const ns = await api?.getVm(state?.id);
                navigate(".", {
                  state: ns,
                  replace: true,
                });
                setEditKey(false);
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
