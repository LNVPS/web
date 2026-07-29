import type { ConfigField } from "lnvps-compose";

/** DNS label rule the backend enforces for a deployment name. */
export const DEPLOYMENT_NAME_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

/** Initial form values for a set of config fields (their declared defaults). */
export function defaultConfigValues(
  fields: Array<ConfigField>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.name] = f.default ?? (f.type === "bool" ? "false" : "");
  }
  return out;
}
