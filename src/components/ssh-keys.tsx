import { useCallback, useEffect, useState } from "react";
import { UserSshKey } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import { FormattedMessage, useIntl } from "react-intl";

export default function SSHKeySelector({
  selectedKey,
  setSelectedKey,
}: {
  selectedKey: UserSshKey["id"];
  setSelectedKey: (k: UserSshKey["id"]) => void;
}) {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const [newKey, setNewKey] = useState("");
  const [newKeyError, setNewKeyError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [showAddKey, setShowAddKey] = useState(false);
  const [sshKeys, setSshKeys] = useState<Array<UserSshKey>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!login?.api) return;
    setIsLoading(true);
    try {
      const keys = await login.api.listSshKeys();
      setSshKeys(keys);
      if (selectedKey === -1 && keys.length > 0) {
        setSelectedKey(keys[0].id);
      } else if (keys.length === 0) {
        setShowAddKey(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [login?.api, selectedKey, setSelectedKey]);

  async function addNewKey() {
    if (!login?.api) return;
    setNewKeyError("");
    try {
      const nk = await login.api.addSshKey(newKeyName, newKey);
      setNewKey("");
      setNewKeyName("");
      setSelectedKey(nk.id);
      setShowAddKey(false);
      await loadKeys();
    } catch (e) {
      if (e instanceof Error) {
        setNewKeyError(e.message);
      }
    }
  }

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  return (
    <div className="flex flex-col gap-2">
      {isLoading && (
        <div className="text-cyber-muted">
          <FormattedMessage defaultMessage="Loading SSH keys..." />
        </div>
      )}
      {!isLoading && sshKeys.length > 0 && (
        <>
          <b className="text-cyber-primary">
            <FormattedMessage defaultMessage="Select SSH Key:" />
          </b>
          <select
            className="bg-cyber-panel p-2 rounded-sm border border-cyber-border"
            value={selectedKey}
            onChange={(e) => setSelectedKey(Number(e.target.value))}
          >
            {sshKeys.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </>
      )}
      {!isLoading && !showAddKey && sshKeys.length > 0 && (
        <AsyncButton onClick={() => setShowAddKey(true)}>
          <FormattedMessage defaultMessage="Add new SSH key" />
        </AsyncButton>
      )}
      {!isLoading && (showAddKey || sshKeys.length === 0) && (
        <>
          <b className="text-cyber-primary">
            <FormattedMessage defaultMessage="Add SSH Key:" />
          </b>
          <textarea
            rows={5}
            placeholder="ssh-[rsa|ed25519] AA== id"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            type="text"
            placeholder={formatMessage({ defaultMessage: "Key name" })}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <AsyncButton
            disabled={newKey.length < 10 || newKeyName.length < 2}
            onClick={addNewKey}
          >
            <FormattedMessage defaultMessage="Add Key" />
          </AsyncButton>
          {newKeyError && <b className="text-cyber-danger">{newKeyError}</b>}
        </>
      )}
    </div>
  );
}
