import { Link, useLocation } from "react-router-dom";
import { NostrDomain, NostrDomainHandle } from "../api";
import { useEffect, useState } from "react";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { NostrDomainRow } from "../components/nostr-domain-row";
import Modal from "../components/modal";
import { tryParseNostrLink } from "@snort/system";
import { hexToBech32 } from "@snort/shared";
import { Icon } from "../components/icon";

export function AccountNostrDomainPage() {
  const { state } = useLocation();
  const login = useLogin();
  const [handles, setHandles] = useState<Array<NostrDomainHandle>>();
  const [addHandle, setAddHandle] = useState(false);
  const [newHandle, setNewHandle] = useState<string>();
  const [newHandlePubkey, setNewHandlePubkey] = useState<string>();
  const [newHandleError, setNewHandleError] = useState<string>();
  const domain = state as NostrDomain;

  useEffect(() => {
    if (login?.api) {
      login.api.listDomainHandles(domain.id).then(setHandles);
    }
  }, [login]);

  return (
    <div className="flex flex-col gap-4">
      <Link to={"/account"}>&lt; Back</Link>
      <NostrDomainRow domain={domain} />
      <div className="text-xl">Handles</div>
      <div className="flex flex-col gap-1">
        {handles !== undefined && handles.length === 0 && (
          <div className="text-red-500 text-sm">No Registerd Handles</div>
        )}
        {handles?.map((a) => (
          <div
            className="flex items-center p-2 rounded-xl bg-neutral-900 justify-between"
            key={a.id}
          >
            <div className="flex flex-col gap-2">
              <div>
                {a.handle}@{domain.name}
              </div>
              <div className="text-neutral-500 text-sm">
                {hexToBech32("npub", a.pubkey)}
              </div>
            </div>
            <AsyncButton
              className="bg-neutral-700 hover:bg-neutral-600"
              onClick={async () => {
                if (
                  login?.api &&
                  confirm("Are you sure you want to delete this handle?")
                ) {
                  await login.api.deleteDomainHandle(a.domain_id, a.id);
                  const handles = await login.api.listDomainHandles(domain.id);
                  setHandles(handles);
                }
              }}
            >
              <Icon name="delete" size={30} />
            </AsyncButton>
          </div>
        ))}
      </div>
      <AsyncButton onClick={() => setAddHandle(true)}>Add Handle</AsyncButton>
      {addHandle && (
        <Modal id="add-handle" onClose={() => setAddHandle(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">Add Handle for {domain.name}</div>
            <input
              type="text"
              placeholder="name"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
            />
            <input
              type="text"
              placeholder="npub/nprofile/hex"
              value={newHandlePubkey}
              onChange={(e) => setNewHandlePubkey(e.target.value)}
            />
            {newHandleError && (
              <div className="text-red-500">{newHandleError}</div>
            )}
            <AsyncButton
              onClick={async () => {
                if (
                  login?.api &&
                  newHandle &&
                  newHandle.length > 0 &&
                  newHandlePubkey &&
                  newHandlePubkey.length > 0
                ) {
                  setNewHandleError(undefined);
                  try {
                    const pubkeyHex =
                      tryParseNostrLink(newHandlePubkey)?.id ?? newHandlePubkey;
                    await login.api.addDomainHandle(
                      domain.id,
                      newHandle,
                      pubkeyHex,
                    );
                    const handles = await login.api.listDomainHandles(
                      domain.id,
                    );
                    setHandles(handles);
                    setNewHandle(undefined);
                    setNewHandlePubkey(undefined);
                    setAddHandle(false);
                  } catch (e) {
                    if (e instanceof Error) {
                      setNewHandleError(e.message);
                    }
                  }
                }
              }}
            >
              Add
            </AsyncButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
