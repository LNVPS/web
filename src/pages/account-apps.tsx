import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { App, AppDeployment, AppDeploymentStatus } from "../api";
import useLogin from "../hooks/login";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { PageHeader, Eyebrow } from "../components/section";
import { StatusPill } from "../components/billing";
import type { BillingTone } from "../components/billing";
import CostLabel from "../components/cost";

/** Map an operator deployment status to a billing tone + label. */
export function deploymentStatus(status: AppDeploymentStatus): {
  tone: BillingTone;
  label: ReactNode;
} {
  switch (status) {
    case "running":
      return { tone: "primary", label: <FormattedMessage defaultMessage="Running" /> };
    case "pending":
      return { tone: "warning", label: <FormattedMessage defaultMessage="Pending" /> };
    case "stopped":
      return { tone: "muted", label: <FormattedMessage defaultMessage="Stopped" /> };
    case "deleting":
      return { tone: "danger", label: <FormattedMessage defaultMessage="Deleting" /> };
    case "error":
    default:
      return { tone: "danger", label: <FormattedMessage defaultMessage="Error" /> };
  }
}

/** App icon, falling back to a monogram tile when no icon is set. */
export function AppIcon({ app, size = 40 }: { app: App; size?: number }) {
  if (app.icon) {
    return (
      <img
        src={app.icon}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-sm object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-sm bg-cyber-panel-light text-cyber-primary font-bold uppercase"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {app.display_name.slice(0, 1)}
    </div>
  );
}

function DeploymentRow({
  deployment,
  app,
}: {
  deployment: AppDeployment;
  app?: App;
}) {
  const st = deploymentStatus(deployment.status);
  return (
    <Link
      to={`/account/apps/deployments/${deployment.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cyber-panel-light/50 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3">
        {app && <AppIcon app={app} size={32} />}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-cyber-text-bright">
            {deployment.name || app?.display_name || `#${deployment.id}`}
          </span>
          {deployment.hostname && (
            <span className="truncate font-mono text-xs text-cyber-accent">
              {deployment.hostname}
            </span>
          )}
        </div>
      </div>
      <StatusPill tone={st.tone}>{st.label}</StatusPill>
    </Link>
  );
}

export function AppCard({ app }: { app: App }) {
  return (
    <Link
      to={`/apps/${app.id}`}
      className="flex flex-col gap-3 rounded-sm border border-cyber-border bg-cyber-panel p-4 transition-all duration-200 hover:border-cyber-primary hover:shadow-neon-sm"
    >
      <div className="flex items-center gap-3">
        <AppIcon app={app} />
        <div className="min-w-0">
          <div className="truncate text-cyber-text-bright">
            {app.display_name}
          </div>
          <div className="text-sm text-cyber-primary tabular-nums">
            <CostLabel
              cost={{
                currency: app.currency,
                amount: app.amount,
                interval_type: app.interval_type,
              }}
            />
          </div>
        </div>
      </div>
      {app.description && (
        <p className="m-0 line-clamp-2 text-sm text-cyber-muted">
          {app.description}
        </p>
      )}
    </Link>
  );
}

export function AccountAppsPage() {
  const login = useLogin();
  const [apps, setApps] = useState<Array<App>>();
  const [deployments, setDeployments] = useState<Array<AppDeployment>>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .listApps()
      .then(setApps)
      .catch((e) => e instanceof Error && setError(e.message));
    login.api
      .listAppDeployments()
      .then(setDeployments)
      .catch(() => setDeployments([]));
  }, [login?.api]);

  const appById = new Map((apps ?? []).map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />
      <PageHeader
        title={<FormattedMessage defaultMessage="Apps" />}
        description={
          <FormattedMessage defaultMessage="One-click Docker apps from a managed catalog." />
        }
      />

      {error && <b className="text-cyber-danger">{error}</b>}

      {deployments && deployments.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>
            <FormattedMessage defaultMessage="Your deployments" />
          </Eyebrow>
          <div className="overflow-hidden rounded-sm border border-cyber-border divide-y divide-cyber-border/60">
            {deployments.map((d) => (
              <DeploymentRow
                key={d.id}
                deployment={d}
                app={appById.get(d.app_id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Eyebrow>
          <FormattedMessage defaultMessage="Catalog" />
        </Eyebrow>
        {apps === undefined && !error ? (
          <div className="flex justify-center py-8">
            <Spinner width={24} height={24} />
          </div>
        ) : apps && apps.length === 0 ? (
          <div className="rounded-sm border border-dashed border-cyber-border bg-cyber-panel/40 px-4 py-10 text-center text-cyber-muted">
            <FormattedMessage defaultMessage="No apps are available yet." />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {apps?.map((a) => (
              <AppCard key={a.id} app={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
