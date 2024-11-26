import { useLocation, useNavigate } from "react-router-dom";
import { LNVpsApi, UserSshKey, VmOsImage, VmTemplate } from "../api";
import { useEffect, useState } from "react";
import CostLabel from "../components/cost";
import { ApiUrl } from "../const";
import { EventPublisher } from "@snort/system";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import classNames from "classnames";
import VpsResources from "../components/vps-resources";
import OsImageName from "../components/os-image-name";

export default function OrderPage() {
  const { state } = useLocation();
  const login = useLogin();
  const navigate = useNavigate();
  const template = state as VmTemplate | undefined;
  const [newKey, setNewKey] = useState("");
  const [newKeyError, setNewKeyError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [useImage, setUseImage] = useState(-1);
  const [useSshKey, setUseSshKey] = useState(-1);
  const [showAddKey, setShowAddKey] = useState(false);
  const [images, setImages] = useState<Array<VmOsImage>>([]);
  const [sshKeys, setSshKeys] = useState<Array<UserSshKey>>([]);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (!login?.signer) return;
    const api = new LNVpsApi(
      ApiUrl,
      new EventPublisher(login.signer, login.pubkey),
    );
    api.listOsImages().then((a) => setImages(a));
    api.listSshKeys().then((a) => {
      setSshKeys(a);
      if (a.length > 0) {
        setUseSshKey(a[0].id);
      } else {
        setShowAddKey(true);
      }
    });
  }, [login]);

  async function addNewKey() {
    if (!login?.signer) return;
    setNewKeyError("");
    const api = new LNVpsApi(
      ApiUrl,
      new EventPublisher(login.signer, login.pubkey),
    );

    try {
      const nk = await api.addSshKey(newKeyName, newKey);
      setNewKey("");
      setNewKeyName("");
      setUseSshKey(nk.id);
      setShowAddKey(false);
      api.listSshKeys().then((a) => setSshKeys(a));
    } catch (e) {
      if (e instanceof Error) {
        setNewKeyError(e.message);
      }
    }
  }

  async function createOrder() {
    if (!login?.signer || !template) return;
    const api = new LNVpsApi(
      ApiUrl,
      new EventPublisher(login.signer, login.pubkey),
    );

    setOrderError("");
    try {
      const newVm = await api.orderVm(template.id, useImage, useSshKey);
      navigate("/vm/renew", {
        state: newVm,
      });
    } catch (e) {
      if (e instanceof Error) {
        setOrderError(e.message);
      }
    }
  }

  const sortedImages = images.sort(
    (a, b) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime(),
  );

  if (!template || !login) {
    return <h3>No order found</h3>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">New Order</div>
      <div className="flex justify-between items-center rounded-xl bg-neutral-900 px-4 py-3">
        <div className="flex flex-col gap-1">
          <div>{template.name}</div>
          <VpsResources vm={template} />
        </div>
        {template.cost_plan && <CostLabel cost={template.cost_plan} />}
      </div>
      <hr />
      <div className="flex flex-col gap-2">
        <b>Select OS:</b>
        {sortedImages.map((a) => (
          <div
            className={classNames(
              "flex justify-between items-center rounded-xl px-4 py-3 cursor-pointer",
              {
                "bg-neutral-900": useImage !== a.id,
                "bg-neutral-700": useImage === a.id,
              },
            )}
            onClick={() => setUseImage(a.id)}
          >
            <OsImageName image={a} />
          </div>
        ))}
      </div>
      <hr />
      <div className="flex flex-col gap-2">
        {sshKeys.length > 0 && (
          <>
            <b>Select SSH Key:</b>
            <select
              className="bg-neutral-900 p-2 rounded-xl"
              value={useSshKey}
              onChange={(e) => setUseSshKey(Number(e.target.value))}
            >
              {sshKeys.map((a) => (
                <option value={a.id}>{a.name}</option>
              ))}
            </select>
          </>
        )}
        {!showAddKey && sshKeys.length > 0 && (
          <AsyncButton onClick={() => setShowAddKey(true)}>
            Add new SSH key
          </AsyncButton>
        )}
        {(showAddKey || sshKeys.length === 0) && (
          <>
            <b>Add SSH Key:</b>
            <textarea
              className="border-none rounded-xl bg-neutral-900 p-2"
              rows={5}
              placeholder="ssh-[rsa|ed25519] AA== id"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <input
              type="text"
              className="border-none rounded-xl bg-neutral-900 p-2"
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <AsyncButton
              disabled={newKey.length < 10 || newKeyName.length < 2}
              onClick={addNewKey}
            >
              Add Key
            </AsyncButton>
            {newKeyError && <b className="text-red-500">{newKeyError}</b>}
          </>
        )}
      </div>
      <AsyncButton
        disabled={useSshKey === -1 || useImage === -1}
        onClick={createOrder}
      >
        Create Order
      </AsyncButton>
      {orderError && <b className="text-red-500">{orderError}</b>}
    </div>
  );
}
