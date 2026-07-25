import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormattedDate, FormattedMessage } from "react-intl";
import { App, AppDeployment } from "../api";
import useLogin from "../hooks/login";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { PageHeader, SectionCard } from "../components/section";
import { StatusPill } from "../components/billing";
import { AsyncButton } from "../components/button";
import { AppIcon, deploymentStatus } from "./account-apps";

export function AccountAppDeploymentPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const deploymentId = Number(id);

  const [deployment, setDeployment] = useState<AppDeployment>();
  const [app, setApp] = useState<App>();
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function reload() {
    if (!login?.api || !Number.isFinite(deploymentId)) return;
    const d = await login.api.getAppDeployment(deploymentId);
    setDeployment(d);
    login.api.getApp(d.app_id).then(setApp).catch(() => {});
  }

  useEffect(() => {
    reload().catch((e) => e instanceof Error && setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login?.api, deploymentId]);

  async function act(fn: () => Promise<AppDeployment>) {
    setError(undefined);
    try {
      setDeployment(await fn());
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function onDelete() {
    if (!login?.api) return;
    setError(undefined);
    try {
      await login.api.deleteAppDeployment(deploymentId);
      navigate("/account/apps");
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  if (!login) return null;

  if (deployment === undefined && !error) {
    return (
      <div className="flex justify-center py-8">
        <Spinner width={24} height={24} />
      </div>
    );
  }
  if (!deployment) {
    return (
      <div className="flex flex-col gap-4">
        {error && <b className="text-cyber-danger">{error}</b>}
        <Link to="/account/apps" className="text-sm text-cyber-primary">
          <FormattedMessage defaultMessage="Back to apps" />
        </Link>
      </div>
    );
  }

  const st = deploymentStatus(deployment.status);
  const isPending = deployment.status === "pending";
  const isRunning = deployment.status === "running";
  const isStopped = deployment.status === "stopped";

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />
      <Link
        to="/account/apps"
        className="text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
      >
        &lsaquo; <FormattedMessage defaultMessage="Back to apps" />
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {app && <AppIcon app={app} size={40} />}
            {deployment.name || `#${deployment.id}`}
          </span>
        }
        description={app?.display_name}
        actions={<StatusPill tone={st.tone}>{st.label}</StatusPill>}
      />

      {error && <b className="text-cyber-danger">{error}</b>}

      {isPending && deployment.subscription_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-cyber-warning/50 bg-cyber-warning/10 px-4 py-3">
          <span className="text-sm text-cyber-text">
            <FormattedMessage defaultMessage="This deployment is awaiting payment. Pay its subscription to activate it." />
          </span>
          <Link
            to={`/account/subscriptions/${deployment.subscription_id}`}
            className="rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-1.5 text-sm font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            <FormattedMessage defaultMessage="Pay to activate" />
          </Link>
        </div>
      )}

      <SectionCard title={<FormattedMessage defaultMessage="Deployment" />}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Endpoint" />
          </dt>
          <dd className="m-0 min-w-0 break-all font-mono text-cyber-accent">
            {deployment.hostname ? (
              <a
                href={`https://${deployment.hostname}`}
                target="_blank"
                rel="noreferrer"
              >
                {deployment.hostname}
              </a>
            ) : (
              <span className="text-cyber-muted">
                <FormattedMessage defaultMessage="Assigned once running" />
              </span>
            )}
          </dd>

          {deployment.status_message && (
            <>
              <dt className="text-cyber-muted">
                <FormattedMessage defaultMessage="Status detail" />
              </dt>
              <dd className="m-0 text-cyber-text">
                {deployment.status_message}
              </dd>
            </>
          )}

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Billing" />
          </dt>
          <dd className="m-0">
            {deployment.subscription_id ? (
              <Link
                to={`/account/subscriptions/${deployment.subscription_id}`}
                className="text-cyber-primary"
              >
                <FormattedMessage defaultMessage="View subscription" />
              </Link>
            ) : (
              "—"
            )}
          </dd>

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Created" />
          </dt>
          <dd className="m-0 text-cyber-text">
            <FormattedDate
              value={deployment.created}
              year="numeric"
              month="short"
              day="numeric"
            />
          </dd>
        </dl>
      </SectionCard>

      {/* Lifecycle */}
      <SectionCard title={<FormattedMessage defaultMessage="Manage" />}>
        <div className="flex flex-wrap items-center gap-2">
          {isRunning && (
            <AsyncButton onClick={() => act(() => login.api.stopAppDeployment(deployment.id))}>
              <FormattedMessage defaultMessage="Stop" />
            </AsyncButton>
          )}
          {isStopped && (
            <AsyncButton
              className="bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
              onClick={() => act(() => login.api.startAppDeployment(deployment.id))}
            >
              <FormattedMessage defaultMessage="Start" />
            </AsyncButton>
          )}

          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-xs text-cyber-muted">
                  <FormattedMessage defaultMessage="Delete permanently?" />
                </span>
                <AsyncButton onClick={async () => setConfirmDelete(false)}>
                  <FormattedMessage defaultMessage="Cancel" />
                </AsyncButton>
                <AsyncButton
                  className="!bg-cyber-danger/15 !border-cyber-danger !text-cyber-danger hover:!bg-cyber-danger/25"
                  onClick={onDelete}
                >
                  <FormattedMessage defaultMessage="Confirm delete" />
                </AsyncButton>
              </>
            ) : (
              <AsyncButton
                className="!bg-cyber-danger/15 !border-cyber-danger !text-cyber-danger hover:!bg-cyber-danger/25"
                onClick={async () => setConfirmDelete(true)}
              >
                <FormattedMessage defaultMessage="Delete" />
              </AsyncButton>
            )}
          </div>
        </div>
        <p className="m-0 mt-3 text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Stopping scales the app to zero and retains its data. Deleting stops billing and permanently removes the deployment and its volumes." />
        </p>
      </SectionCard>
    </div>
  );
}
