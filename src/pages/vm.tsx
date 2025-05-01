import "@xterm/xterm/css/xterm.css";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { VmInstance, VmIpAssignment } from "../api";
import VpsInstanceRow from "../components/vps-instance";
import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";
import Modal from "../components/modal";
import SSHKeySelector from "../components/ssh-keys";

export default function VmPage() {
  const location = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const navigate = useNavigate();
  const [state, setState] = useState<VmInstance | undefined>(location?.state);

  const [editKey, setEditKey] = useState(false);
  const [editReverse, setEditReverse] = useState<VmIpAssignment>();
  const [error, setError] = useState<string>();
  const [key, setKey] = useState(state?.ssh_key?.id ?? -1);

  async function reloadVmState() {
    if (!state) return;
    const newState = await login?.api.getVm(state.id);
    setState(newState);
  }

  function ipRow(a: VmIpAssignment, reverse: boolean) {
    return (
      <div
        key={a.id}
        className="bg-neutral-900 px-2 py-3 rounded-lg flex gap-2 flex-col justify-center"
      >
        <div>
          <span className="select-none">IP: </span>
          <span className="select-all">{a.ip.split("/")[0]}</span>
        </div>
        {a.forward_dns && (
          <div className="text-sm select-none">
            DNS: <span className="select-all">{a.forward_dns}</span>
          </div>
        )}
        {reverse && (
          <div className="text-sm select-none flex items-center gap-2">
            <div>
              PTR: <span className="select-all">{a.reverse_dns}</span>
            </div>
            <Icon
              name="pencil"
              className="inline"
              size={15}
              onClick={() => setEditReverse(a)}
            />
          </div>
        )}
      </div>
    );
  }

  function networkInfo() {
    if (!state) return;
    if ((state.ip_assignments?.length ?? 0) === 0) {
      return <div className="text-sm text-red-500">No IP's assigned</div>;
    }
    return <>{state.ip_assignments?.map((i) => ipRow(i, true))}</>;
  }

  useEffect(() => {
    const t = setInterval(() => reloadVmState(), 5000);
    return () => clearInterval(t);
  }, []);

  if (!state) {
    return <h2>No VM selected</h2>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to={"/account"}>
        &lt; Back
      </Link>
      <VpsInstanceRow vm={state} actions={true} />

      <div className="text-xl">Network:</div>
      <div className="grid grid-cols-2 gap-4">{networkInfo()}</div>
      <div className="flex gap-2 items-center">
        <div className="text-xl">SSH Key:</div>
        <div className="text-sm bg-neutral-900 px-3 py-1 rounded-lg">
          {state.ssh_key?.name}
        </div>
        <Icon name="pencil" onClick={() => setEditKey(true)} />
      </div>
      <hr />
      <div className="flex gap-4">
        <AsyncButton onClick={() => navigate("/vm/console", { state })}>
          Console
        </AsyncButton>
        <AsyncButton onClick={() => navigate("/vm/billing", { state })}>
          Billing
        </AsyncButton>
        <AsyncButton onClick={() => navigate("/vm/graphs", { state })}>
          Graphs
        </AsyncButton>
      </div>

      {editKey && (
        <Modal id="edit-ssh-key" onClose={() => setEditKey(false)}>
          <SSHKeySelector selectedKey={key} setSelectedKey={setKey} />
          <div className="flex flex-col gap-4 mt-8">
            <small>After selecting a new key, please restart the VM.</small>
            {error && <b className="text-red-500">{error}</b>}
            <AsyncButton
              onClick={async () => {
                setError(undefined);
                if (!login?.api) return;
                try {
                  await login.api.patchVm(state.id, {
                    ssh_key_id: key,
                  });
                  await reloadVmState();
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
            <input
              type="text"
              placeholder="my-domain.com"
              value={editReverse.reverse_dns}
              onChange={(e) =>
                setEditReverse({
                  ...editReverse,
                  reverse_dns: e.target.value,
                })
              }
            />
            <small>DNS updates can take up to 48hrs to propagate.</small>
            {error && <b className="text-red-500">{error}</b>}
            <AsyncButton
              onClick={async () => {
                setError(undefined);
                if (!login?.api) return;

                try {
                  await login.api.patchVm(state.id, {
                    reverse_dns: editReverse.reverse_dns,
                  });
                  await reloadVmState();
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
