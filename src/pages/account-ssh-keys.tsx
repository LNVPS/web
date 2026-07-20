import { useCallback, useEffect, useState } from "react";
import { UserSshKey } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";
import Modal from "../components/modal";
import { PageHeader } from "../components/section";
import { showError } from "../toast";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";

export function AccountSshKeysPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const [sshKeys, setSshKeys] = useState<Array<UserSshKey>>();
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyError, setNewKeyError] = useState("");

  const loadKeys = useCallback(async () => {
    if (!login?.api) return;
    const keys = await login.api.listSshKeys();
    setSshKeys(keys);
  }, [login?.api]);

  useEffect(() => {
    loadKeys().catch(showError);
  }, [loadKeys]);

  async function addNewKey() {
    if (!login?.api) return;
    setNewKeyError("");
    try {
      await login.api.addSshKey(newKeyName, newKey);
      setNewKey("");
      setNewKeyName("");
      setShowAddKey(false);
      await loadKeys();
    } catch (e) {
      if (e instanceof Error) {
        setNewKeyError(e.message);
      }
    }
  }

  async function deleteKey(key: UserSshKey) {
    if (!login?.api) return;
    if (key.vms && key.vms.length > 0) return;
    if (
      !confirm(
        formatMessage(
          {
            defaultMessage: 'Are you sure you want to delete SSH key "{name}"?',
          },
          { name: key.name },
        ),
      )
    ) {
      return;
    }
    try {
      await login.api.deleteSshKey(key.id);
      await loadKeys();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={<FormattedMessage defaultMessage="SSH Keys" />}
        description={
          <FormattedMessage defaultMessage="Manage the SSH keys used to access your VMs." />
        }
        actions={
          <AsyncButton onClick={() => setShowAddKey(true)}>
            <FormattedMessage defaultMessage="Add SSH Key" />
          </AsyncButton>
        }
      />

      <div className="flex flex-col gap-2">
        {sshKeys === undefined && (
          <div className="text-cyber-muted">
            <FormattedMessage defaultMessage="Loading SSH keys..." />
          </div>
        )}
        {sshKeys !== undefined && sshKeys.length === 0 && (
          <div className="text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="You have no SSH keys." />
          </div>
        )}
        {sshKeys?.map((a) => (
          <div
            className="flex items-center p-3 rounded-sm border border-cyber-border bg-cyber-panel justify-between gap-2"
            key={a.id}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-cyber-text-bright truncate">{a.name}</div>
              {a.created && (
                <div className="text-cyber-muted text-sm">
                  <FormattedMessage
                    defaultMessage="Added {date}"
                    values={{
                      date: (
                        <FormattedDate
                          value={new Date(a.created)}
                          dateStyle="medium"
                        />
                      ),
                    }}
                  />
                </div>
              )}
              {a.vms && a.vms.length > 0 && (
                <div className="text-cyber-muted text-sm">
                  <FormattedMessage
                    defaultMessage="In use by {count, plural, one {VM} other {VMs}}: {vms}"
                    values={{
                      count: a.vms.length,
                      vms: a.vms.map((id) => `#${id}`).join(", "),
                    }}
                  />
                </div>
              )}
            </div>
            <AsyncButton
              className="bg-cyber-panel-light border-cyber-border hover:border-cyber-danger hover:shadow-neon-danger shrink-0 disabled:opacity-40 disabled:hover:border-cyber-border disabled:hover:shadow-none"
              disabled={(a.vms?.length ?? 0) > 0}
              title={
                (a.vms?.length ?? 0) > 0
                  ? formatMessage({
                      defaultMessage:
                        "This SSH key is in use by one or more VMs and cannot be deleted.",
                    })
                  : undefined
              }
              onClick={() => deleteKey(a)}
            >
              <Icon name="delete" size={24} />
            </AsyncButton>
          </div>
        ))}
      </div>

      {showAddKey && (
        <Modal id="add-ssh-key" onClose={() => setShowAddKey(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">
              <FormattedMessage defaultMessage="Add SSH Key" />
            </div>
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
            {newKeyError && (
              <div className="text-cyber-danger">{newKeyError}</div>
            )}
            <AsyncButton
              disabled={newKey.length < 10 || newKeyName.length < 2}
              onClick={addNewKey}
            >
              <FormattedMessage defaultMessage="Add Key" />
            </AsyncButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
