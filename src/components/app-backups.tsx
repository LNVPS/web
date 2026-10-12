import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedDate, FormattedMessage } from "react-intl";
import { AppBackup, AppBackupState, AppDeployment } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import { StatusPill, BillingTone } from "./billing";
import BytesSize from "./bytes";
import { groupBackupRuns, hasActiveRun } from "../utils/app-backups";

const POLL_MS = 10_000;

const STATE_TONE: Record<AppBackupState, BillingTone> = {
  pending: "muted",
  running: "warning",
  completed: "primary",
  failed: "danger",
};

function BackupStateLabel({ state }: { state: AppBackupState }) {
  switch (state) {
    case "pending":
      return <FormattedMessage defaultMessage="Queued" />;
    case "running":
      return <FormattedMessage defaultMessage="Running" />;
    case "completed":
      return <FormattedMessage defaultMessage="Ready" />;
    case "failed":
      return <FormattedMessage defaultMessage="Failed" />;
  }
}

export default function AppBackups({
  deployment,
  canStart,
}: {
  deployment: AppDeployment;
  canStart: boolean;
}) {
  const login = useLogin();
  const [backups, setBackups] = useState<Array<AppBackup>>();
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string>();

  const runs = useMemo(() => groupBackupRuns(backups ?? []), [backups]);
  const active = hasActiveRun(runs);

  const reload = useCallback(async () => {
    if (!login?.api) return;
    setBackups(await login.api.listAppBackups(deployment.id));
  }, [login?.api, deployment.id]);

  useEffect(() => {
    reload().catch((e) => e instanceof Error && setError(e.message));
  }, [reload]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      reload().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [active, reload]);

  async function act(fn: () => Promise<unknown>) {
    setError(undefined);
    try {
      await fn();
      await reload();
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function download(backup: AppBackup) {
    if (!login?.api) return;
    setError(undefined);
    try {
      const link = await login.api.getAppBackupDownload(
        deployment.id,
        backup.id,
      );
      window.location.assign(link.url);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  if (!login?.api) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="A backup copies your app's data to LNVPS storage. Download it to keep your own copy." />
        </p>
        {canStart && (
          <AsyncButton
            disabled={active}
            className={
              active
                ? "opacity-50 cursor-not-allowed"
                : "bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
            }
            onClick={() => act(() => login.api.startAppBackup(deployment.id))}
          >
            <FormattedMessage defaultMessage="Back up now" />
          </AsyncButton>
        )}
      </div>

      {error && <b className="text-sm text-cyber-danger">{error}</b>}

      {backups && runs.length === 0 && (
        <p className="m-0 text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="No backups yet." />
        </p>
      )}

      {runs.map((run) => (
        <div
          key={run.run_id}
          className="flex flex-col gap-2 rounded-sm border border-cyber-border px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusPill tone={STATE_TONE[run.state]}>
              <BackupStateLabel state={run.state} />
            </StatusPill>
            <span className="text-cyber-text">
              <FormattedDate
                value={run.created}
                year="numeric"
                month="short"
                day="numeric"
                hour="2-digit"
                minute="2-digit"
              />
            </span>
            <span className="text-xs text-cyber-muted">
              {run.scheduled ? (
                <FormattedMessage defaultMessage="Scheduled" />
              ) : (
                <FormattedMessage defaultMessage="Manual" />
              )}
            </span>
            {run.size_bytes > 0 && (
              <span className="text-xs text-cyber-muted">
                <BytesSize value={run.size_bytes} precision={1} />
              </span>
            )}
            {run.state !== "pending" && run.state !== "running" && (
              <span className="ml-auto flex items-center gap-2">
                {confirmDelete === run.run_id ? (
                  <>
                    <AsyncButton
                      onClick={async () => setConfirmDelete(undefined)}
                    >
                      <FormattedMessage defaultMessage="Cancel" />
                    </AsyncButton>
                    <AsyncButton
                      className="!bg-cyber-danger/15 !border-cyber-danger !text-cyber-danger hover:!bg-cyber-danger/25"
                      onClick={() =>
                        act(async () => {
                          for (const b of run.backups) {
                            await login.api.deleteAppBackup(
                              deployment.id,
                              b.id,
                            );
                          }
                          setConfirmDelete(undefined);
                        })
                      }
                    >
                      <FormattedMessage defaultMessage="Confirm delete" />
                    </AsyncButton>
                  </>
                ) : (
                  <AsyncButton
                    onClick={async () => setConfirmDelete(run.run_id)}
                  >
                    <FormattedMessage defaultMessage="Delete" />
                  </AsyncButton>
                )}
              </span>
            )}
          </div>
          {run.backups.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 text-xs"
            >
              <span className="font-mono text-cyber-text">{b.artifact}</span>
              {b.size_bytes ? (
                <span className="text-cyber-muted">
                  <BytesSize value={b.size_bytes} precision={1} />
                </span>
              ) : null}
              {b.state === "failed" && b.message && (
                <span className="text-cyber-danger">{b.message}</span>
              )}
              {b.state === "completed" && (
                <AsyncButton className="ml-auto" onClick={() => download(b)}>
                  <FormattedMessage defaultMessage="Download" />
                </AsyncButton>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
