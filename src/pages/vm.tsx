import "@xterm/xterm/css/xterm.css";

import { Link, useLocation } from "react-router-dom";
import { VmInstance, VmIpAssignment } from "../api";
import VmActions from "../components/vps-actions";
import BytesSize from "../components/bytes";
import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";
import Modal from "../components/modal";
import SSHKeySelector from "../components/ssh-keys";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";

function StatBlock({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-cyber-panel rounded-sm px-4 py-3 flex flex-col gap-1">
      <div className="text-xs text-cyber-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="text-cyber-text-bright font-medium">{value}</div>
    </div>
  );
}

export default function VmPage() {
  const location = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const { formatMessage, formatNumber } = useIntl();
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

  function ipRow(a: VmIpAssignment) {
    return (
      <div
        key={a.id}
        className="bg-cyber-panel px-3 py-3 rounded-sm flex flex-col gap-1"
      >
        <div className="text-xs text-cyber-muted uppercase tracking-wide">
          <FormattedMessage defaultMessage="IP Address" />
        </div>
        <span className="select-all font-mono text-cyber-text-bright">
          {a.ip.split("/")[0]}
        </span>
        {a.forward_dns && (
          <>
            <div className="text-xs text-cyber-muted uppercase tracking-wide mt-1">
              DNS
            </div>
            <span className="select-all font-mono text-sm">
              {a.forward_dns}
            </span>
          </>
        )}
        <div className="text-xs text-cyber-muted uppercase tracking-wide mt-1">
          PTR
        </div>
        <div className="flex items-center gap-2">
          <span className="select-all font-mono text-sm">
            {a.reverse_dns ?? "—"}
          </span>
          <Icon
            name="pencil"
            className="inline shrink-0"
            size={13}
            onClick={() => setEditReverse(a)}
          />
        </div>
      </div>
    );
  }

  useEffect(() => {
    const t = setInterval(() => reloadVmState(), 5000);
    return () => clearInterval(t);
  }, []);

  function bestHost() {
    if (!state) return;
    if (state.ip_assignments.length > 0) {
      const ip = state.ip_assignments.at(0)!;
      return ip.forward_dns ? ip.forward_dns : ip.ip.split("/")[0];
    }
  }

  if (!state) {
    return (
      <h2>
        <FormattedMessage defaultMessage="No VM selected" />
      </h2>
    );
  }

  const isNew = !state.expires;
  const expires = state.expires ? new Date(state.expires) : undefined;
  const now = new Date();
  const isExpired = expires ? expires <= now : false;
  const daysLeft = expires
    ? Math.ceil((expires.getTime() - now.getTime()) / 1000 / 60 / 60 / 24)
    : undefined;

  const vmState = state.status?.state;
  const isCreating = vmState === "creating";
  const isRunning = vmState === "running";
  const isStopped = vmState === "stopped";

  const t = state.template;
  const img = state.image;

  // Status pill
  const statusEl = isCreating ? (
    <span className="inline-flex items-center gap-1.5 text-yellow-400 text-sm">
      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
      <FormattedMessage defaultMessage="Creating" />
    </span>
  ) : isRunning ? (
    <span className="inline-flex items-center gap-1.5 text-cyber-primary text-sm">
      <span className="w-2 h-2 rounded-full bg-cyber-primary shadow-neon-sm inline-block" />
      <FormattedMessage defaultMessage="Running" />
      {state.status?.cpu_usage !== undefined && (
        <span className="text-cyber-muted">
          &middot;{" "}
          {formatNumber(state.status.cpu_usage, {
            style: "percent",
            maximumFractionDigits: 1,
          })}{" "}
          CPU
        </span>
      )}
      {state.status?.mem_usage !== undefined && (
        <span className="text-cyber-muted">
          &middot;{" "}
          {formatNumber(state.status.mem_usage, {
            style: "percent",
            maximumFractionDigits: 0,
          })}{" "}
          RAM
        </span>
      )}
    </span>
  ) : isStopped ? (
    <span className="inline-flex items-center gap-1.5 text-cyber-danger text-sm">
      <span className="w-2 h-2 rounded-full bg-cyber-danger shadow-neon-danger inline-block" />
      <FormattedMessage defaultMessage="Stopped" />
    </span>
  ) : null;

  // Expiry badge
  const expiryEl = isNew ? (
    <span className="text-cyber-primary text-sm">
      <FormattedMessage defaultMessage="Awaiting first payment" />
    </span>
  ) : isExpired ? (
    <span className="text-cyber-danger text-sm">
      <FormattedMessage defaultMessage="Expired" />
    </span>
  ) : daysLeft !== undefined ? (
    <span
      className={`text-sm ${daysLeft <= 3 ? "text-cyber-danger" : daysLeft <= 7 ? "text-yellow-400" : "text-cyber-muted"}`}
    >
      <FormattedMessage
        defaultMessage="{daysLeft} days remaining"
        values={{ daysLeft }}
      />
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />

      {/* Header row: name + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-semibold text-cyber-text-bright">
            {state.ip_assignments?.[0]?.reverse_dns ?? t.name}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {statusEl}
            {statusEl && expiryEl && (
              <span className="text-cyber-border">|</span>
            )}
            {expiryEl}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isNew && (
            <Link
              to="/vm/billing/renew"
              className="text-cyber-primary text-sm border border-cyber-primary px-3 py-1 rounded-sm hover:shadow-neon-sm transition-all"
              state={state}
            >
              <FormattedMessage defaultMessage="Pay Now" />
            </Link>
          )}
          {isExpired && (
            <Link
              to="/vm/billing/renew"
              className="text-cyber-danger text-sm border border-cyber-danger px-3 py-1 rounded-sm hover:shadow-neon-danger transition-all"
              state={state}
            >
              <FormattedMessage defaultMessage="Renew" />
            </Link>
          )}
          {!isNew && !isExpired && !isCreating && (
            <VmActions vm={state} onReload={reloadVmState} />
          )}
        </div>
      </div>

      {/* Spec grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBlock
          label={<FormattedMessage defaultMessage="CPU" />}
          value={
            <FormattedMessage defaultMessage="{n} vCPU" values={{ n: t.cpu }} />
          }
        />
        <StatBlock
          label={<FormattedMessage defaultMessage="Memory" />}
          value={<BytesSize value={t.memory} />}
        />
        <StatBlock
          label={<FormattedMessage defaultMessage="Disk" />}
          value={
            <>
              <BytesSize value={t.disk_size} />{" "}
              <span className="text-cyber-muted text-xs">
                {t.disk_type.toUpperCase()}
              </span>
            </>
          }
        />
        <StatBlock
          label={<FormattedMessage defaultMessage="OS" />}
          value={`${img.distribution} ${img.flavour} ${img.version}`}
        />
        <StatBlock
          label={<FormattedMessage defaultMessage="Region" />}
          value={t.region.name}
        />
        <StatBlock
          label={<FormattedMessage defaultMessage="SSH Key" />}
          value={
            <span className="flex items-center gap-2">
              {state.ssh_key?.name ?? "—"}
              <Icon
                name="pencil"
                className="inline shrink-0"
                size={13}
                onClick={() => setEditKey(true)}
              />
            </span>
          }
        />
      </div>

      {/* Creating state — loader */}
      {isCreating && (
        <div className="flex flex-col items-center gap-4 py-10 border border-dashed border-yellow-400/40 rounded-sm">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-yellow-400"
                style={{
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <div className="text-yellow-400 text-sm">
            <FormattedMessage defaultMessage="Your VM is being provisioned. This usually takes a minute or two." />
          </div>
          <div className="text-cyber-muted text-xs">
            <FormattedMessage defaultMessage="This page will update automatically." />
          </div>
        </div>
      )}

      {/* Network + SSH — hidden while creating */}
      {!isCreating && (
        <>
          <div>
            <div className="text-sm text-cyber-muted uppercase tracking-wide mb-3">
              <FormattedMessage defaultMessage="Network" />
            </div>
            {(state.ip_assignments?.length ?? 0) === 0 ? (
              <div className="text-sm text-cyber-danger">
                <FormattedMessage defaultMessage="No IPs assigned" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.ip_assignments.map((a) => ipRow(a))}
              </div>
            )}
          </div>

          {(state.ip_assignments?.length ?? 0) > 0 && (
            <div>
              <div className="text-sm text-cyber-muted uppercase tracking-wide mb-3">
                <FormattedMessage defaultMessage="SSH" />
              </div>
              <pre className="select-all bg-cyber-panel px-4 py-3 rounded-sm font-mono text-sm text-cyber-text-bright w-fit">
                ssh {state.image.default_username}@{bestHost()}
              </pre>
            </div>
          )}

          <hr />

          <div className="flex gap-4 flex-wrap">
            <AsyncButton
              className="border-cyber-danger text-cyber-danger hover:border-cyber-danger hover:shadow-neon-danger hover:text-cyber-danger"
              onClick={async () => {
                if (
                  confirm(
                    formatMessage({
                      defaultMessage:
                        "Are you sure you want to re-install your VM?\nTHIS WILL DELETE ALL DATA!!",
                    }),
                  )
                ) {
                  await login?.api.reinstallVm(state.id);
                  await reloadVmState();
                }
              }}
            >
              <FormattedMessage defaultMessage="Reinstall" />
            </AsyncButton>
          </div>
        </>
      )}

      {editKey && (
        <Modal id="edit-ssh-key" onClose={() => setEditKey(false)}>
          <SSHKeySelector selectedKey={key} setSelectedKey={setKey} />
          <div className="flex flex-col gap-4 mt-8">
            <small>
              <FormattedMessage defaultMessage="After selecting a new key, please restart the VM." />
            </small>
            {error && <b className="text-cyber-danger">{error}</b>}
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
              <FormattedMessage defaultMessage="Save" />
            </AsyncButton>
          </div>
        </Modal>
      )}

      {editReverse && (
        <Modal id="edit-reverse" onClose={() => setEditReverse(undefined)}>
          <div className="flex flex-col gap-4">
            <div className="text-lg">
              <FormattedMessage defaultMessage="Reverse DNS:" />
            </div>
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
            <small>
              <FormattedMessage defaultMessage="DNS updates can take up to 48hrs to propagate." />
            </small>
            {error && <b className="text-cyber-danger">{error}</b>}
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
              <FormattedMessage defaultMessage="Save" />
            </AsyncButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
