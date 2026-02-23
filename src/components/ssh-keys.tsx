import { useCallback, useEffect, useState } from "react";
import { UserSshKey } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";

export default function SSHKeySelector({
  selectedKey,
  setSelectedKey,
}: {
  selectedKey: UserSshKey["id"];
  setSelectedKey: (k: UserSshKey["id"]) => void;
}) {
  const login = useLogin();
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
      // Only auto-select if no key is currently selected
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
      // Reload the keys list to include the new key
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
      {isLoading && <div className="text-cyber-muted">Loading SSH keys...</div>}
      {!isLoading && sshKeys.length > 0 && (
        <>
          <b className="text-cyber-primary">Select SSH Key:</b>
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
          Add new SSH key
        </AsyncButton>
      )}
      {!isLoading && (showAddKey || sshKeys.length === 0) && (
        <>
          <b className="text-cyber-primary">Add SSH Key:</b>
          <textarea
            rows={5}
            placeholder="ssh-[rsa|ed25519] AA== id"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            type="text"
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
          {newKeyError && <b className="text-cyber-danger">{newKeyError}</b>}
        </>
      )}
    </div>
  );
}
