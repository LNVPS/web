import { useEffect, useState } from "react";
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

  async function addNewKey() {
    if (!login?.api) return;
    setNewKeyError("");

    try {
      const nk = await login?.api.addSshKey(newKeyName, newKey);
      setNewKey("");
      setNewKeyName("");
      setSelectedKey(nk.id);
      setShowAddKey(false);
      login?.api.listSshKeys().then((a) => setSshKeys(a));
    } catch (e) {
      if (e instanceof Error) {
        setNewKeyError(e.message);
      }
    }
  }

  useEffect(() => {
    if (!login?.api) return;
    login?.api.listSshKeys().then((a) => {
      setSshKeys(a);
      if (a.length > 0) {
        setSelectedKey(a[0].id);
      } else {
        setShowAddKey(true);
      }
    });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {sshKeys.length > 0 && (
        <>
          <b className="text-cyber-primary">Select SSH Key:</b>
          <select
            className="bg-cyber-panel p-2 rounded-sm border border-cyber-border"
            value={selectedKey}
            onChange={(e) => setSelectedKey(Number(e.target.value))}
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
