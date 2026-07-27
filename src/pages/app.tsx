import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLoaderData, useParams } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { App, AppDeployment, LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import useLogin from "../hooks/login";
import Spinner from "../components/spinner";
import Seo from "../components/seo";
import { Eyebrow, SectionCard } from "../components/section";
import { StatusPill } from "../components/billing";
import CostLabel, { CostAmount } from "../components/cost";
import DeployAppForm from "../components/deploy-app-form";
import Markdown from "../components/markdown";
import { fetchReadme } from "../utils/readme";
import { appJsonLd } from "../utils/app-seo";
import { highlightYaml } from "../utils/yaml-highlight";
import type { AppLoaderData } from "../loaders";
import BytesSize from "../components/bytes";
import { AppIcon, AppResources, deploymentStatus } from "./account-apps";

/** README, clamped to 50dvh with a fade + 'view full' link when it overflows. */
function ReadmeSection({
  content,
  repoUrl,
}: {
  content: string;
  repoUrl?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () =>
      setOverflowing(el.scrollHeight > window.innerHeight * 0.5);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [content]);

  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>
        <FormattedMessage defaultMessage="Readme" />
      </Eyebrow>
      <div className="relative overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
        <div
          ref={ref}
          className={overflowing ? "max-h-[50dvh] overflow-hidden p-4" : "p-4"}
        >
          <Markdown content={content} />
        </div>
        {overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cyber-panel to-transparent" />
        )}
      </div>
      {overflowing && repoUrl && (
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="self-start text-sm text-cyber-primary hover:underline"
        >
          <FormattedMessage defaultMessage="View full README" /> ↗
        </a>
      )}
    </div>
  );
}

export function AppPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  // Seeded by appLoader so the first (server) render already has the app, and
  // therefore a real title and h1. The effect below still refreshes it.
  const { app: loadedApp } = useLoaderData<AppLoaderData>();

  const [app, setApp] = useState<App | undefined>(loadedApp);
  const [deployments, setDeployments] = useState<Array<AppDeployment>>([]);
  const [readme, setReadme] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!Number.isFinite(appId)) return;
    // The catalog is public; browse with an unauthenticated client when logged
    // out. Deployments are user-owned, so only fetch those when logged in.
    const api = login?.api ?? new LNVpsApi(ApiUrl, undefined);
    api
      .getApp(appId)
      .then((a) => {
        setApp(a);
        if (a.repo_url) fetchReadme(a.repo_url).then(setReadme).catch(() => {});
      })
      .catch((e) => e instanceof Error && setError(e.message));
    if (login?.api) {
      login.api
        .listAppDeployments()
        .then((d) => setDeployments(d.filter((x) => x.app_id === appId)))
        .catch(() => setDeployments([]));
    }
  }, [login?.api, appId]);

  return (
    <div className="flex flex-col gap-6">
      {app ? (
        <Seo
          title={app.display_name}
          canonical={`/apps/${app.id}`}
          description={
            app.description ??
            formatMessage(
              {
                defaultMessage:
                  "Deploy {name} as a managed app on LNVPS — pay with Lightning, Bitcoin, or card.",
              },
              { name: app.display_name },
            )
          }
          jsonLd={appJsonLd(app)}
        />
      ) : (
        // The loader found no app: either the id does not exist or the catalog
        // was unreachable. Both render an empty shell, so keep those out of the
        // index rather than letting a soft 404 be crawled.
        <Seo noindex={true} />
      )}
      <Link
        to={login ? "/account/apps" : "/"}
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
                <h1 className="m-0 text-3xl text-cyber-text-bright">
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
          </div>

          <div className="flex flex-col gap-1">
            <AppResources app={app} />
            {app.services.length > 1 && (
              <div className="flex flex-col gap-0.5">
                {app.services.map((s) => (
                  <div
                    key={s.name}
                    className="font-mono text-xs text-cyber-muted tabular-nums"
                  >
                    <span className="text-cyber-text">{s.name}</span>{" "}
                    <FormattedMessage
                      defaultMessage="{cores} vCPU"
                      values={{
                        cores:
                          s.cpu_milli / 1000 === Math.round(s.cpu_milli / 1000)
                            ? Math.round(s.cpu_milli / 1000)
                            : (s.cpu_milli / 1000).toFixed(2),
                      }}
                    />{" · "}
                    <BytesSize value={s.memory_bytes} />{" · "}
                    <BytesSize value={s.storage_bytes} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {app.description && (
            <p className="m-0 max-w-prose text-cyber-text">{app.description}</p>
          )}

          {app.repo_url && (
            <a
              href={app.repo_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-cyber-primary hover:underline"
            >
              <FormattedMessage defaultMessage="Source repository" /> ↗
            </a>
          )}

          <SectionCard title={<FormattedMessage defaultMessage="Deploy" />}>
            {login ? (
              <DeployAppForm app={app} />
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="m-0 text-sm text-cyber-muted">
                  <FormattedMessage defaultMessage="Log in to deploy this app." />
                </p>
                <Link
                  to="/login"
                  className="rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-1.5 text-sm font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
                >
                  <FormattedMessage defaultMessage="Log in" />
                </Link>
              </div>
            )}
          </SectionCard>

          {deployments.length > 0 && (
            <div className="flex flex-col gap-3">
              <Eyebrow>
                <FormattedMessage defaultMessage="Your deployments" />
              </Eyebrow>
              <div className="overflow-hidden rounded-sm border border-cyber-border divide-y divide-cyber-border/60">
                {deployments.map((d) => {
                  const st = deploymentStatus(d.status);
                  return (
                    <Link
                      key={d.id}
                      to={`/account/apps/deployments/${d.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cyber-panel-light/50 transition-colors"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-cyber-text-bright">
                          {d.name || `#${d.id}`}
                        </span>
                        {d.hostname && (
                          <span className="truncate font-mono text-xs text-cyber-accent">
                            {d.hostname}
                          </span>
                        )}
                        {d.status_message && (
                          <span className="text-xs text-cyber-muted">
                            {d.status_message}
                          </span>
                        )}
                      </div>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {readme && (
            <ReadmeSection content={readme} repoUrl={app.repo_url} />
          )}

          <div className="flex flex-col gap-2">
            <Eyebrow>
              <FormattedMessage defaultMessage="Compose" />
            </Eyebrow>
            <pre className="overflow-x-auto rounded-sm border border-cyber-border bg-cyber-panel p-4 font-mono text-xs text-cyber-text">
              {highlightYaml(app.compose)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
