import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { App, AppDeployment } from "../api";
import useLogin from "../hooks/login";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { Eyebrow } from "../components/section";
import { StatusPill } from "../components/billing";
import CostLabel, { CostAmount } from "../components/cost";
import { AppIcon, deploymentStatus } from "./account-apps";

export function AccountAppPage() {
  const login = useLogin();
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);

  const [app, setApp] = useState<App>();
  const [deployments, setDeployments] = useState<Array<AppDeployment>>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api || !Number.isFinite(appId)) return;
    login.api
      .getApp(appId)
      .then(setApp)
      .catch((e) => e instanceof Error && setError(e.message));
    login.api
      .listAppDeployments()
      .then((d) => setDeployments(d.filter((x) => x.app_id === appId)))
      .catch(() => setDeployments([]));
  }, [login?.api, appId]);

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />
      <Link
        to="/account/apps"
        className="text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
      >
        &lsaquo; <FormattedMessage defaultMessage="Back to apps" />
      </Link>

      {error && <b className="text-cyber-danger">{error}</b>}

      {app === undefined && !error ? (
        <div className="flex justify-center py-8">
          <Spinner width={24} height={24} />
        </div>
      ) : app ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <AppIcon app={app} size={56} />
              <div>
                <h1 className="m-0 text-2xl text-cyber-text-bright">
                  {app.display_name}
                </h1>
                <div className="mt-1 text-cyber-primary tabular-nums">
                  <CostLabel
                    cost={{
                      currency: app.currency,
                      amount: app.amount,
                      interval_type: app.interval_type,
                    }}
                  />
                  {app.setup_amount > 0 && (
                    <span className="ml-2 text-xs text-cyber-muted">
                      <FormattedMessage
                        defaultMessage="+ {fee} setup"
                        values={{
                          fee: (
                            <CostAmount
                              cost={{
                                currency: app.currency,
                                amount: app.setup_amount,
                              }}
                              converted={false}
                            />
                          ),
                        }}
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Ordering + lifecycle land in a later backend release. */}
            <span className="rounded-sm border border-cyber-border bg-cyber-panel-light px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
              <FormattedMessage defaultMessage="Deployment coming soon" />
            </span>
          </div>

          {app.description && (
            <p className="m-0 max-w-prose text-cyber-text">{app.description}</p>
          )}

          {deployments.length > 0 && (
            <div className="flex flex-col gap-3">
              <Eyebrow>
                <FormattedMessage defaultMessage="Your deployments" />
              </Eyebrow>
              <div className="overflow-hidden rounded-sm border border-cyber-border divide-y divide-cyber-border/60">
                {deployments.map((d) => {
                  const st = deploymentStatus(d.status);
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-cyber-text-bright">
                          {d.name || `#${d.id}`}
                        </span>
                        {d.hostname && (
                          <a
                            href={`https://${d.hostname}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-mono text-xs text-cyber-accent"
                          >
                            {d.hostname}
                          </a>
                        )}
                        {d.status_message && (
                          <span className="text-xs text-cyber-muted">
                            {d.status_message}
                          </span>
                        )}
                      </div>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Eyebrow>
              <FormattedMessage defaultMessage="Compose" />
            </Eyebrow>
            <pre className="overflow-x-auto rounded-sm border border-cyber-border bg-cyber-panel p-4 font-mono text-xs text-cyber-text">
              {app.compose}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
