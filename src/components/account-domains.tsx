import { useState, useEffect } from "react";
import { NostrDomainsResponse } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import Modal from "./modal";
import { NostrDomainRow } from "./nostr-domain-row";

export function AccountNostrDomains() {
  const login = useLogin();
  const [domains, setDomains] = useState<NostrDomainsResponse>();
  const [addDomain, setAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState<string>();

  useEffect(() => {
    if (login?.api) {
      login.api.listDomains().then(setDomains);
    }
  }, [login]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3>Nostr Domains</h3>
        <small>
          Free NIP-05 hosting, add a CNAME entry pointing to
          <code className="bg-neutral-900 px-2 py-1 rounded-full select-all">
            {domains?.cname}
          </code>
        </small>
        {domains?.domains.map((d) => (
          <NostrDomainRow domain={d} canEdit={true} />
        ))}
      </div>
      <AsyncButton onClick={() => setAddDomain(true)}>Add Domain</AsyncButton>
      {addDomain && (
        <Modal id="add-nostr-domain" onClose={() => setAddDomain(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">Add Nostr Domain</div>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
            />
            <AsyncButton
              onClick={async () => {
                if (newDomain && newDomain.length > 4 && login?.api) {
                  await login.api.addDomain(newDomain);
                  const doms = await login.api.listDomains();
                  setDomains(doms);
                  setNewDomain(undefined);
                  setAddDomain(false);
                }
              }}
            >
              Add
            </AsyncButton>
          </div>
        </Modal>
      )}
    </>
  );
}
