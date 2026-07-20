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
import { Eyebrow, PageHeader } from "../components/section";
import { showError } from "../toast";
import { FormattedMessage, useIntl } from "react-intl";

export function AccountNostrDomainPage() {
  const { state } = useLocation();
  const login = useLogin();
  const { formatMessage } = useIntl();
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
      <Link
        to={"/account/domains"}
        className="w-fit text-sm text-cyber-muted hover:text-cyber-text transition-all"
      >
        &lt; <FormattedMessage defaultMessage="Back" />
      </Link>
      <PageHeader
        title={domain.name}
        description={
          <FormattedMessage defaultMessage="Manage the NIP-05 handles registered on this domain." />
        }
        actions={
          <AsyncButton onClick={() => setAddHandle(true)}>
            <FormattedMessage defaultMessage="Add Handle" />
          </AsyncButton>
        }
      />
      <NostrDomainRow domain={domain} />
      <Eyebrow>
        <FormattedMessage defaultMessage="Handles" />
      </Eyebrow>
      <div className="flex flex-col gap-1">
        {handles !== undefined && handles.length === 0 && (
          <div className="text-cyber-danger text-sm">
            <FormattedMessage defaultMessage="No Registered Handles" />
          </div>
        )}
        {handles?.map((a) => (
          <div
            className="flex items-center p-2 rounded-sm border border-cyber-border bg-cyber-panel justify-between"
            key={a.id}
          >
            <div className="flex flex-col gap-2">
              <div className="text-cyber-text-bright">
                {a.handle}@{domain.name}
              </div>
              <div className="text-cyber-muted text-sm">
                {hexToBech32("npub", a.pubkey)}
              </div>
            </div>
            <AsyncButton
              className="bg-cyber-panel-light border-cyber-border hover:border-cyber-danger hover:shadow-neon-danger"
              onClick={async () => {
                if (
                  login?.api &&
                  confirm(
                    formatMessage({
                      defaultMessage:
                        "Are you sure you want to delete this handle?",
                    }),
                  )
                ) {
                  try {
                    await login.api.deleteDomainHandle(a.domain_id, a.id);
                    const handles = await login.api.listDomainHandles(
                      domain.id,
                    );
                    setHandles(handles);
                  } catch (e) {
                    showError(e);
                  }
                }
              }}
            >
              <Icon name="delete" size={30} />
            </AsyncButton>
          </div>
        ))}
      </div>
      {addHandle && (
        <Modal id="add-handle" onClose={() => setAddHandle(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">
              <FormattedMessage
                defaultMessage="Add Handle for {name}"
                values={{ name: domain.name }}
              />
            </div>
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
              <div className="text-cyber-danger">{newHandleError}</div>
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
              <FormattedMessage defaultMessage="Add" />
            </AsyncButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
