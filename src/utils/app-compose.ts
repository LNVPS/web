import yaml from "js-yaml";

export type AppConfigFieldType = "string" | "int" | "bool" | "file";

/** A customer-provided config field, parsed from an app's compose `config:` list. */
export interface AppConfigField {
  name: string;
  label?: string;
  type: AppConfigFieldType;
  default?: string;
  required: boolean;
}

const FIELD_TYPES: Array<AppConfigFieldType> = ["string", "int", "bool", "file"];

/**
 * Extract the deploy-form fields from an app's compose YAML. The top-level
 * `config:` list declares the inputs the customer fills in; everything else in
 * the compose (services/volumes/secrets) is rendering detail we don't need.
 */
export function parseAppConfig(compose: string): Array<AppConfigField> {
  let doc: unknown;
  try {
    doc = yaml.load(compose);
  } catch {
    return [];
  }
  const raw = (doc as { config?: unknown })?.config;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((f): AppConfigField | undefined => {
      const field = f as Record<string, unknown>;
      if (typeof field.name !== "string" || field.name.length === 0) {
        return undefined;
      }
      const type =
        typeof field.type === "string" &&
        (FIELD_TYPES as Array<string>).includes(field.type)
          ? (field.type as AppConfigFieldType)
          : "string";
      return {
        name: field.name,
        label: typeof field.label === "string" ? field.label : undefined,
        type,
        default:
          field.default != null ? String(field.default) : undefined,
        required: field.required === true,
      };
    })
    .filter((f): f is AppConfigField => f !== undefined);
}

/** Initial form values for a set of config fields (their declared defaults). */
export function defaultConfigValues(
  fields: Array<AppConfigField>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.name] = f.default ?? (f.type === "bool" ? "false" : "");
  }
  return out;
}

/** DNS label rule the backend enforces for a deployment name. */
export const DEPLOYMENT_NAME_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
