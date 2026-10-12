import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { App, AppRegion } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import { parseComposeSchema } from "lnvps-compose";
import { ConfigFields } from "./config-fields";
import {
  DEPLOYMENT_NAME_RE,
  defaultConfigValues,
  hasMissingRequired,
} from "../utils/deployment-form";

export default function DeployAppForm({ app }: { app: App }) {
  const login = useLogin();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  const fields = useMemo(
    () => parseComposeSchema(app.compose).config,
    [app.compose],
  );
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaultConfigValues(fields),
  );
  const [regions, setRegions] = useState<Array<AppRegion>>();
  const [regionId, setRegionId] = useState<number>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .listAppRegions(app.id)
      .then((r) => {
        setRegions(r);
        setRegionId(r.find((x) => x.available)?.id ?? r[0]?.id);
      })
      .catch((e) => e instanceof Error && setError(e.message));
  }, [login?.api, app.id]);

  const selectedRegion = regions?.find((r) => r.id === regionId);
  const nameValid = DEPLOYMENT_NAME_RE.test(name);
  // Preview the eventual public hostname: `{name}.{cluster ingress domain}`.
  const hostnamePreview =
    nameValid && selectedRegion?.ingress_domain
      ? `${name}.${selectedRegion.ingress_domain}`
      : undefined;
  const missingRequired = hasMissingRequired(
    fields,
    (f) => values[f.name] ?? "",
  );
  const canDeploy = nameValid && regionId !== undefined && !missingRequired;

  async function deploy() {
    if (!login?.api || !canDeploy || regionId === undefined) return;
    setError(undefined);
    try {
      const deployment = await login.api.createAppDeployment({
        app_id: app.id,
        name: name.trim(),
        region_id: regionId,
        config: values,
      });
      // Pending with a subscription — the detail page prompts to pay & activate.
      navigate(`/account/apps/deployments/${deployment.id}`);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
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
          placeholder="my-relay"
          maxLength={40}
          onChange={(e) => setName(e.target.value.toLowerCase())}
        />
        <span className="text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Lowercase letters, digits and hyphens. Becomes your subdomain." />
        </span>
        {hostnamePreview && (
          <span className="font-mono text-xs text-cyber-accent">
            {hostnamePreview}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
          <FormattedMessage defaultMessage="Region" />
        </span>
        <select
          value={regionId ?? ""}
          onChange={(e) => setRegionId(Number(e.target.value))}
          disabled={!regions || regions.length === 0}
        >
          {regions?.map((r) => (
            <option key={r.id} value={r.id} disabled={!r.available}>
              {r.name}
              {r.available
                ? ""
                : ` (${formatMessage({ defaultMessage: "full" })})`}
            </option>
          ))}
        </select>
      </label>

      {fields.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-cyber-border pt-4">
          <ConfigFields
            fields={fields}
            valueOf={(f) => values[f.name] ?? ""}
            onChange={(name, v) => setValues((s) => ({ ...s, [name]: v }))}
          />
        </div>
      )}

      {error && <b className="text-sm text-cyber-danger">{error}</b>}

      <div>
        <AsyncButton
          disabled={!canDeploy}
          className={
            canDeploy
              ? "bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
              : "opacity-50 cursor-not-allowed"
          }
          onClick={deploy}
        >
          <FormattedMessage defaultMessage="Deploy" />
        </AsyncButton>
      </div>
    </div>
  );
}
