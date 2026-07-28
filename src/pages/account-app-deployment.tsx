import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FormattedDate,
  FormattedMessage,
  FormattedRelativeTime,
} from "react-intl";
import {
  App,
  AppDeployment,
  AppDeploymentUsage,
  AppUpgradeQuote,
  MAX_RESOURCE_MULTIPLIER,
} from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { ConfigInput } from "../components/deploy-app-form";
import { parseAppConfig } from "../utils/app-compose";
import Spinner from "../components/spinner";
import BytesSize from "../components/bytes";
import Seo from "../components/seo";
import { PageHeader, SectionCard } from "../components/section";
import { StatusPill } from "../components/billing";
import { AsyncButton } from "../components/button";
import { CostAmount } from "../components/cost";
import PaymentFlow from "../components/payment-flow";
import { appUpgradeSource } from "../components/payment-sources";
import {
  AppIcon,
  AppResources,
  deploymentStatus,
  vcpu,
} from "./account-apps";
import {
  DeploymentLifecycle,
  deploymentLifecycle,
  deploymentPermissions,
  lifecycleStepState,
  usageBarReading,
} from "../utils/app-deployment";

/**
 * The three steps a deployment walks on its way to serving traffic, which is
 * what Kieran asked to see: needs payment → deploying → running.
 *
 * Only rendered on that path. Stopped, expired, errored and deleting are not
 * points along it — a progress bar reading "2 of 3" on a deployment the
 * customer stopped on purpose says nothing true — so those states show the
 * status pill alone.
 */
function LifecycleProgress({ lifecycle }: { lifecycle: DeploymentLifecycle }) {
  const steps: Array<{ key: DeploymentLifecycle; label: ReactNode }> = [
    { key: "unpaid", label: <FormattedMessage defaultMessage="Payment" /> },
    {
      key: "deploying",
      label: <FormattedMessage defaultMessage="Deploying" />,
    },
    { key: "running", label: <FormattedMessage defaultMessage="Running" /> },
  ];
  const at = steps.findIndex((s) => s.key === lifecycle);
  if (at === -1) return null;

  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[0.65rem] uppercase tracking-[0.2em]">
      {steps.map((s, i) => {
        const state = lifecycleStepState(i, at, steps.length);
        return (
          <li key={String(s.key)} className="flex items-center gap-2">
            {i > 0 && (
              <span
                aria-hidden
                className={
                  "h-px w-6 " +
                  (i <= at ? "bg-cyber-primary" : "bg-cyber-border")
                }
              />
            )}
            <span
              className={
                state === "done"
                  ? "text-cyber-primary"
                  : state === "current"
                    ? "text-cyber-text-bright"
                    : "text-cyber-muted"
              }
              aria-current={i === at ? "step" : undefined}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Edit a deployment's instance name and config field values.
 *
 * `readOnly` shows the same values without letting them be changed, for the
 * states where there is nothing to apply them to yet — the settings are worth
 * reading before paying, and a save that the API would refuse is not.
 */
function ConfigEditor({
  app,
  deployment,
  readOnly,
  onSaved,
  onError,
}: {
  app: App;
  deployment: AppDeployment;
  readOnly?: boolean;
  onSaved: (d: AppDeployment) => void;
  onError: (msg: string) => void;
}) {
  const login = useLogin();
  const fields = useMemo(() => parseAppConfig(app.compose), [app.compose]);
  const [name, setName] = useState(deployment.name);
  const [customDomain, setCustomDomain] = useState(
    deployment.custom_domain ?? "",
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...deployment.config,
  }));
  const [saved, setSaved] = useState(false);

  const nameChanged = name.trim() !== deployment.name;
  const domainChanged =
    customDomain.trim() !== (deployment.custom_domain ?? "");
  const canSave = nameChanged || domainChanged || fields.length > 0;

  async function save() {
    if (!login?.api) return;
    onError("");
    setSaved(false);
    try {
      const updated = await login.api.patchAppDeployment(deployment.id, {
        name: nameChanged ? name.trim() : undefined,
        custom_domain: domainChanged ? customDomain.trim() : undefined,
        config: fields.length > 0 ? values : undefined,
      });
      onSaved(updated);
      setSaved(true);
    } catch (e) {
      if (e instanceof Error) onError(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
          <FormattedMessage defaultMessage="Instance name" />
        </span>
        <input
          type="text"
          value={name}
          maxLength={40}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value.toLowerCase())}
        />
        {nameChanged && (
          <span className="text-xs text-cyber-warning">
            <FormattedMessage defaultMessage="Renaming changes the public hostname." />
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
          <FormattedMessage defaultMessage="Custom domain" />
        </span>
        <input
          type="text"
          value={customDomain}
          placeholder="blog.example.com"
          disabled={readOnly}
          onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
        />
        <span className="text-xs text-cyber-muted">
          {deployment.hostname ? (
            <FormattedMessage
              defaultMessage="Point a CNAME for this domain at {hostname}, then save. HTTPS starts working once DNS resolves. Leave empty to remove."
              values={{
                hostname: (
                  <span className="font-mono text-cyber-accent">
                    {deployment.hostname}
                  </span>
                ),
              }}
            />
          ) : (
            <FormattedMessage defaultMessage="Point a CNAME for this domain at the deployment hostname once it is assigned. Leave empty to remove." />
          )}
        </span>
      </label>

      {fields.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-cyber-border pt-4">
          {fields.map((f) => (
            <ConfigInput
              key={f.name}
              field={f}
              value={values[f.name] ?? f.default ?? ""}
              disabled={readOnly}
              onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
            />
          ))}
          <p className="m-0 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Saving re-applies the config and restarts the app." />
          </p>
        </div>
      )}

      {readOnly ? (
        <p className="m-0 text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Settings can be changed once this deployment is paid for and running." />
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <AsyncButton
            disabled={!canSave}
            className={
              canSave
                ? "bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
                : "opacity-50 cursor-not-allowed"
            }
            onClick={save}
          >
            <FormattedMessage defaultMessage="Save changes" />
          </AsyncButton>
          {saved && (
            <span className="text-xs text-cyber-primary">
              <FormattedMessage defaultMessage="Saved. The app will restart shortly." />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Payment methods the upgrade endpoint can charge interactively. Same set as
 * the VM upgrade flow — NWC and LNURL have no interactive upgrade path.
 */
const UPGRADE_METHODS = ["lightning", "revolut", "paypal", "stripe"];

/**
 * Resize a deployment to a larger multiple of its app's base size: quote first,
 * then pay. The API applies the resize only once that payment settles, so an
 * abandoned upgrade leaves the deployment untouched.
 */
function UpgradeSection({
  deployment,
  onUpgraded,
}: {
  deployment: AppDeployment;
  onUpgraded: () => void;
}) {
  const login = useLogin();
  // Only used to pick the currency the quote comes back in; the method actually
  // charged is chosen inside the payment flow.
  const { data: paymentMethods } = usePaymentMethods();
  // An API predating the resource multiplier omits the field; treat that as the
  // base size rather than putting NaN in the controls.
  const current = Math.max(1, deployment.resource_multiplier || 1);
  const atMax = current >= MAX_RESOURCE_MULTIPLIER;

  const [target, setTarget] = useState(
    Math.min(current + 1, MAX_RESOURCE_MULTIPLIER),
  );
  const [quote, setQuote] = useState<AppUpgradeQuote>();
  const [error, setError] = useState<string>();
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

  const upgradeMethods = paymentMethods?.filter((m) =>
    UPGRADE_METHODS.includes(m.name),
  );

  // Prefer a method settling in the user's currency so the quote is shown in
  // it; otherwise the first available.
  useEffect(() => {
    if (selectedMethod || !upgradeMethods?.length) return;
    const match = upgradeMethods.find((m) =>
      (m.currencies as Array<string>).includes(login?.currency ?? ""),
    );
    setSelectedMethod((match ?? upgradeMethods[0]).name);
  }, [selectedMethod, upgradeMethods, login?.currency]);

  // The API prorates against the remaining paid period, so a deployment that
  // has never been paid for has nothing to quote against. It answers with a 400
  // saying so; say it up front instead of on submit.
  if (
    deployment.status === "pending" ||
    deployment.subscription_id === undefined
  ) {
    return (
      <p className="m-0 text-sm text-cyber-muted">
        <FormattedMessage defaultMessage="Pay for this deployment before resizing it — an upgrade is charged pro-rata against the time left on the current period." />
      </p>
    );
  }

  if (atMax) {
    return (
      <p className="m-0 text-sm text-cyber-muted">
        <FormattedMessage
          defaultMessage="This deployment is already at the largest size we offer ({max}× the base app). Contact us if you need more."
          values={{ max: MAX_RESOURCE_MULTIPLIER }}
        />
      </p>
    );
  }

  if (showPaymentFlow && quote && login?.api) {
    return (
      <PaymentFlow
        title={
          <FormattedMessage
            defaultMessage="Resize to {size}× base"
            values={{ size: target }}
          />
        }
        source={appUpgradeSource(
          login.api,
          deployment.id,
          { resource_multiplier: target },
          deployment.subscription_id,
        )}
        onPaymentComplete={() => {
          setShowPaymentFlow(false);
          setQuote(undefined);
          onUpgraded();
        }}
        onCancel={() => setShowPaymentFlow(false)}
      />
    );
  }

  async function getQuote() {
    if (!login?.api) return;
    setError(undefined);
    setQuote(undefined);
    try {
      setQuote(
        await login.api.getAppUpgradeQuote(
          deployment.id,
          { resource_multiplier: target },
          selectedMethod || undefined,
        ),
      );
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  // Sizes above the current one, up to the API's cap. Downgrades don't exist —
  // volumes cannot shrink — so they are never offered.
  const sizes: Array<number> = [];
  for (let m = current + 1; m <= MAX_RESOURCE_MULTIPLIER; m++) sizes.push(m);

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-cyber-muted">
        <FormattedMessage
          defaultMessage="Running at {current}× the base app. Resizing costs the difference for the rest of this period, then the new rate from the next renewal. The new size applies once the payment settles, and sizes can only go up."
          values={{ current }}
        />
      </p>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
            <FormattedMessage defaultMessage="New size" />
          </span>
          <select
            value={target}
            onChange={(e) => {
              setTarget(Number(e.target.value));
              setQuote(undefined);
            }}
          >
            {sizes.map((m) => (
              <option key={m} value={m}>
                {`${m}×`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
            <FormattedMessage defaultMessage="Quote currency" />
          </span>
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setQuote(undefined);
            }}
          >
            {upgradeMethods?.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name.charAt(0).toUpperCase() + m.name.slice(1)}
                {m.currencies.length > 0 && ` (${m.currencies.join(", ")})`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <b className="text-cyber-danger">{error}</b>}

      {quote && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-cyber-border pt-4 text-sm tabular-nums">
          {/* The API returns `cost_difference` already net of `discount`
              (lnvps_api_common/src/pricing.rs:1466). Showing the gross first
              makes the credit visibly subtract into it, the same derivation
              the VM upgrade quote shows. */}
          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Cost at new size for the rest of this period" />
          </dt>
          <dd className="m-0">
            <CostAmount
              cost={{
                currency: quote.cost_difference.currency,
                amount: quote.cost_difference.amount + quote.discount.amount,
              }}
              converted={false}
            />
          </dd>

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Credit for time already paid" />
          </dt>
          <dd className="m-0">
            &minus;&nbsp;
            <CostAmount cost={quote.discount} converted={false} />
          </dd>

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="Pro-rated upgrade" />
          </dt>
          <dd className="m-0">
            <CostAmount cost={quote.cost_difference} converted={false} />
          </dd>

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="VAT" />
          </dt>
          <dd className="m-0">
            <CostAmount cost={quote.tax} converted={false} />
          </dd>

          {quote.processing_fee.amount > 0 && (
            <>
              <dt className="text-cyber-muted">
                <FormattedMessage defaultMessage="Processing fee" />
              </dt>
              <dd className="m-0">
                <CostAmount cost={quote.processing_fee} converted={false} />
              </dd>
            </>
          )}

          <dt className="text-cyber-text-bright">
            <FormattedMessage defaultMessage="Total due now" />
          </dt>
          <dd className="m-0 text-cyber-text-bright">
            <CostAmount
              cost={{
                currency: quote.cost_difference.currency,
                amount:
                  quote.cost_difference.amount +
                  quote.tax.amount +
                  quote.processing_fee.amount,
              }}
              converted={false}
            />
          </dd>

          <dt className="text-cyber-muted">
            <FormattedMessage defaultMessage="New renewal price" />
          </dt>
          <dd className="m-0">
            <CostAmount cost={quote.new_renewal_cost} converted={false} />
          </dd>
        </dl>
      )}

      <div className="flex items-center gap-3">
        <AsyncButton onClick={getQuote}>
          <FormattedMessage defaultMessage="Get quote" />
        </AsyncButton>
        {quote && (
          <AsyncButton
            className="bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
            onClick={async () => setShowPaymentFlow(true)}
          >
            <FormattedMessage defaultMessage="Pay and resize" />
          </AsyncButton>
        )}
      </div>
    </div>
  );
}

/**
 * A horizontal percentage bar with a label, the proportion used, and absolute
 * figures. Shows nothing when the quota side is zero (no limit declared).
 */
function UsageBar({
  label,
  used,
  quota,
  renderValue,
}: {
  label: ReactNode;
  used: number;
  quota: number;
  renderValue: (n: number) => ReactNode;
}) {
  const reading = usageBarReading(used, quota);
  if (!reading) return null;
  const high = reading.level === "critical";
  const mid = reading.level === "warning";
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-bold uppercase tracking-[0.15em] text-cyber-muted flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full border border-cyber-border bg-cyber-panel-light overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${high ? "bg-cyber-danger" : mid ? "bg-cyber-warning" : "bg-cyber-primary"}`}
          style={{ width: `${reading.pct}%` }}
        />
      </div>
      <span
        className={`min-w-[5.5rem] text-right font-mono text-xs tabular-nums ${high ? "text-cyber-danger" : mid ? "text-cyber-warning" : "text-cyber-text"}`}
      >
        {renderValue(used)}&nbsp;/&nbsp;{renderValue(quota)}
      </span>
    </div>
  );
}

/** Readable age for a usage reading. */
function UsageAge({ collected }: { collected: string }) {
  const now = useRef(Date.now()).current;
  const collectedMs = Date.parse(collected);
  const seconds = Math.round((now - collectedMs) / 1000);

  // Under a minute: render as "just now" to avoid flashing "0 seconds ago".
  if (seconds < 60) {
    return <FormattedMessage defaultMessage="just now" />;
  }
  return (
    <FormattedRelativeTime
      value={-Math.round(seconds)}
      unit="second"
      updateIntervalInSeconds={30}
    />
  );
}

/** A `cpu_milli` figure in vCPU, translated the same way {@link AppResources} renders one. */
function cpuLabel(milli: number): ReactNode {
  return (
    <FormattedMessage
      defaultMessage="{cores} vCPU"
      values={{ cores: vcpu(milli) }}
    />
  );
}

/** Live resource usage for a deployment showing totals, breakdown, and age. */
function DeploymentUsageCard({
  usage,
  quotaCpuMilli,
  quotaMemBytes,
  quotaStorageBytes,
}: {
  usage: AppDeploymentUsage;
  quotaCpuMilli: number;
  quotaMemBytes: number;
  quotaStorageBytes: number;
}) {
  return (
    <SectionCard title={<FormattedMessage defaultMessage="Usage" />}>
      <div className="flex flex-col gap-3">
        <UsageBar
          label={<FormattedMessage defaultMessage="CPU" />}
          used={usage.cpu_milli}
          quota={quotaCpuMilli}
          renderValue={cpuLabel}
        />
        <UsageBar
          label={<FormattedMessage defaultMessage="RAM" />}
          used={usage.memory_bytes}
          quota={quotaMemBytes}
          renderValue={(n) => <BytesSize value={n} />}
        />
        {usage.storage_bytes != null && (
          <UsageBar
            label={<FormattedMessage defaultMessage="Storage" />}
            used={usage.storage_bytes}
            quota={quotaStorageBytes}
            renderValue={(n) => <BytesSize value={n} />}
          />
        )}

        <p className="m-0 mt-1 text-xs text-cyber-muted">
          <FormattedMessage
            defaultMessage="Collected {when}"
            values={{ when: <UsageAge collected={usage.collected} /> }}
          />
        </p>

        {usage.services.length > 0 && (
          <div className="border-t border-cyber-border pt-3 mt-1">
            <p className="m-0 mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              <FormattedMessage defaultMessage="By service" />
            </p>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-left text-cyber-muted">
                  <th className="font-normal pb-1 pr-3">
                    <FormattedMessage defaultMessage="Service" />
                  </th>
                  <th className="font-normal pb-1 pr-3">
                    <FormattedMessage defaultMessage="CPU" />
                  </th>
                  <th className="font-normal pb-1">
                    <FormattedMessage defaultMessage="RAM" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.services.map((s) => (
                  <tr key={s.service} className="text-cyber-text">
                    <td className="py-0.5 pr-3 font-mono">{s.service}</td>
                    <td className="py-0.5 pr-3">{cpuLabel(s.cpu_milli)}</td>
                    <td className="py-0.5">
                      <BytesSize value={s.memory_bytes} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {usage.volumes.length > 0 && (
          <div className="border-t border-cyber-border pt-3 mt-1">
            <p className="m-0 mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              <FormattedMessage defaultMessage="By volume" />
            </p>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-left text-cyber-muted">
                  <th className="font-normal pb-1 pr-3">
                    <FormattedMessage defaultMessage="Volume" />
                  </th>
                  <th className="font-normal pb-1">
                    <FormattedMessage defaultMessage="Used" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.volumes.map((v) => (
                  <tr key={`${v.service}/${v.name}`} className="text-cyber-text">
                    <td className="py-0.5 pr-3 font-mono">
                      {v.service}/{v.name}
                    </td>
                    <td className="py-0.5">
                      <BytesSize value={v.storage_bytes} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

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
    login.api
      .getApp(d.app_id)
      .then(setApp)
      .catch(() => {});
  }

  useEffect(() => {
    reload().catch((e) => e instanceof Error && setError(e.message));

    // The lifecycle moves on its own — a payment lands, the operator
    // provisions, the pod comes up — and none of it is a click on this page
    // (`LNVPS/web#71`). Refetching the deployment lets `deploymentLifecycle`
    // re-derive, so the banner, the pill and the section gates all follow.
    // Same 5s interval as the VM page (`vm.tsx:108-110`).
    //
    // Only the deployment: the catalog app it renders alongside does not
    // change while the page is open.
    //
    // Poll failures are dropped rather than shown. This runs every 5s against
    // a page the customer is reading; one dropped request should not paint an
    // error over data that is still on screen and still correct, and the next
    // tick recovers. The initial load above still surfaces its failure.
    const t = setInterval(() => {
      if (!login?.api || !Number.isFinite(deploymentId)) return;
      login.api
        .getAppDeployment(deploymentId)
        .then(setDeployment)
        .catch(() => {});
    }, 5_000);
    return () => clearInterval(t);
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

  // One derived state drives the pill, the banner and every section gate, so
  // the page cannot say "stopped" in the header and offer a resize quote
  // underneath.
  const lifecycle = deploymentLifecycle(deployment);
  const can = deploymentPermissions(lifecycle);
  const st = deploymentStatus(lifecycle);

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

      <LifecycleProgress lifecycle={lifecycle} />

      {error && <b className="text-cyber-danger">{error}</b>}

      {/* The banner is the state's one call to action, so at most one shows.
          `unpaid` and `expired` both need the subscription to act on; without
          a `subscription_id` there is nowhere to send the customer, so the
          pill carries the state alone rather than offering a dead link. */}
      {lifecycle === "unpaid" && deployment.subscription_id && (
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

      {lifecycle === "expired" && deployment.subscription_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-cyber-warning/50 bg-cyber-warning/10 px-4 py-3">
          {/* "Your data is still here" is the load-bearing half: the operator
              keeps the volumes on expiry, and a customer who believes they are
              gone has no reason to renew. */}
          <span className="text-sm text-cyber-text">
            <FormattedMessage defaultMessage="This deployment's subscription has expired and it has been scaled to zero. Your data is still here — renew to start it again." />
          </span>
          <Link
            to={`/account/subscriptions/${deployment.subscription_id}`}
            className="rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-1.5 text-sm font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            <FormattedMessage defaultMessage="Renew" />
          </Link>
        </div>
      )}

      {lifecycle === "deploying" && (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3">
          <Spinner width={16} height={16} />
          <span className="text-sm text-cyber-text">
            <FormattedMessage defaultMessage="Setting up — this usually takes a minute. The endpoint appears once it is running." />
          </span>
        </div>
      )}

      {lifecycle === "error" && deployment.status_message && (
        <div className="rounded-sm border border-cyber-danger/50 bg-cyber-danger/10 px-4 py-3 text-sm text-cyber-text">
          {deployment.status_message}
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

          {deployment.custom_domain && (
            <>
              <dt className="text-cyber-muted">
                <FormattedMessage defaultMessage="Custom domain" />
              </dt>
              <dd className="m-0 min-w-0 break-all font-mono text-cyber-accent">
                <a
                  href={`https://${deployment.custom_domain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {deployment.custom_domain}
                </a>
              </dd>
            </>
          )}

          {/* The deployment's own figures, not the catalog app's: these already
              have the resource multiplier applied. Skipped entirely against an
              API old enough not to send them, rather than shown as an empty
              row. */}
          {(deployment.cpu_milli > 0 ||
            deployment.memory_bytes > 0 ||
            deployment.storage_bytes > 0) && (
            <>
              <dt className="text-cyber-muted">
                <FormattedMessage defaultMessage="Size" />
              </dt>
              <dd className="m-0 flex flex-wrap items-center gap-x-3 text-cyber-text">
                <AppResources
                  app={deployment}
                  className="font-mono text-xs text-cyber-text tabular-nums"
                />
                {deployment.resource_multiplier > 1 && (
                  <span className="text-xs text-cyber-primary">
                    <FormattedMessage
                      defaultMessage="{multiplier}× base app"
                      values={{ multiplier: deployment.resource_multiplier }}
                    />
                  </span>
                )}
              </dd>
            </>
          )}

          {/* The error banner above already carries this message, so the row
              would repeat it verbatim. Every other state keeps it — it is
              detail there, not the headline. */}
          {deployment.status_message && lifecycle !== "error" && (
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

      {/* Usage */}
      {(deployment.cpu_milli > 0 ||
        deployment.memory_bytes > 0 ||
        deployment.storage_bytes > 0) &&
        (deployment.usage ? (
          <DeploymentUsageCard
            usage={deployment.usage}
            quotaCpuMilli={deployment.cpu_milli}
            quotaMemBytes={deployment.memory_bytes}
            quotaStorageBytes={deployment.storage_bytes}
          />
        ) : (
          <SectionCard title={<FormattedMessage defaultMessage="Usage" />}>
            <p className="m-0 text-sm text-cyber-muted">
              <FormattedMessage defaultMessage="Not yet measured." />
            </p>
          </SectionCard>
        ))}

      {/* Config + rename. Shown in every state — the values are worth reading
          even when they cannot be changed — but only saveable once there is a
          deployment to apply them to. */}
      {app && (
        <SectionCard title={<FormattedMessage defaultMessage="Configure" />}>
          <ConfigEditor
            key={`${deployment.id}-${deployment.name}-${deployment.custom_domain ?? ""}`}
            app={app}
            deployment={deployment}
            readOnly={!can.configEditable}
            onSaved={setDeployment}
            onError={(m) => setError(m || undefined)}
          />
        </SectionCard>
      )}

      {/* Resize. Hidden unless there is a paid period to prorate against —
          the API answers 400 otherwise, and quoting against a period nobody
          bought was the second half of web#54. */}
      {can.size && (
        <SectionCard title={<FormattedMessage defaultMessage="Size" />}>
          <UpgradeSection
            // Remount when the size changes so the selector re-bases off the new
            // multiplier instead of offering a size that is no longer an upgrade.
            key={`${deployment.id}-${deployment.resource_multiplier}`}
            deployment={deployment}
            onUpgraded={() =>
              reload().catch((e) => e instanceof Error && setError(e.message))
            }
          />
        </SectionCard>
      )}

      {/* Lifecycle */}
      {(can.stop || can.start || can.delete) && (
        <SectionCard title={<FormattedMessage defaultMessage="Manage" />}>
          <div className="flex flex-wrap items-center gap-2">
            {can.stop && (
              <AsyncButton
                onClick={() =>
                  act(() => login.api.stopAppDeployment(deployment.id))
                }
              >
                <FormattedMessage defaultMessage="Stop" />
              </AsyncButton>
            )}
            {can.start && (
              <AsyncButton
                className="bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
                onClick={() =>
                  act(() => login.api.startAppDeployment(deployment.id))
                }
              >
                <FormattedMessage defaultMessage="Start" />
              </AsyncButton>
            )}

            {/* Delete stays available in every state but `deleting`: someone who
              ordered by mistake and never paid must be able to remove it
              without paying first, and an expired one without renewing. */}
            {can.delete && (
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
            )}
          </div>
          <p className="m-0 mt-3 text-xs text-cyber-muted">
            {can.stop || can.start ? (
              <FormattedMessage defaultMessage="Stopping scales the app to zero and retains its data. Deleting stops billing and permanently removes the deployment and its volumes." />
            ) : (
              <FormattedMessage defaultMessage="Deleting stops billing and permanently removes the deployment and its volumes." />
            )}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
