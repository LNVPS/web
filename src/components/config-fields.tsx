import { useMemo } from "react";
import {
  configFieldDisplayLabel,
  groupConfigFields,
  type ConfigField,
} from "lnvps-compose";
import { hasMissingRequired } from "../utils/deployment-form";

export function ConfigInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ConfigField;
  value: string;
  onChange: (v: string) => void;
  /** Show the value without letting it be edited (see `LNVPS/web#54`). */
  disabled?: boolean;
}) {
  const label = configFieldDisplayLabel(field);
  if (field.type === "bool") {
    return (
      <label
        className={
          "flex items-center gap-2 text-sm text-cyber-text select-none " +
          (disabled ? "opacity-60" : "cursor-pointer")
        }
      >
        <input
          type="checkbox"
          checked={value === "true"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        {label}
      </label>
    );
  }
  return (
    <label className={"flex flex-col gap-1 " + (disabled ? "opacity-60" : "")}>
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
        {label}
        {field.required && <span className="text-cyber-danger"> *</span>}
      </span>
      {field.type === "file" ? (
        <textarea
          rows={4}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      ) : (
        <input
          type={field.type === "int" ? "number" : "text"}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function ConfigFields({
  fields,
  valueOf,
  onChange,
  disabled,
}: {
  fields: Array<ConfigField>;
  valueOf: (field: ConfigField) => string;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}) {
  const { ungrouped, groups } = useMemo(
    () => groupConfigFields(fields),
    [fields],
  );
  const input = (f: ConfigField) => (
    <ConfigInput
      key={f.name}
      field={f}
      value={valueOf(f)}
      disabled={disabled}
      onChange={(v) => onChange(f.name, v)}
    />
  );
  return (
    <>
      {ungrouped.map(input)}
      {groups.map((g) => (
        <details
          key={g.name}
          open={hasMissingRequired(g.fields, valueOf)}
          className="border border-cyber-border rounded-sm px-3 py-2"
        >
          <summary className="cursor-pointer text-sm font-medium text-cyber-text hover:text-cyber-text-bright select-none">
            {g.name}{" "}
            <span className="text-cyber-muted">({g.fields.length})</span>
          </summary>
          <div className="flex flex-col gap-3 pt-3">{g.fields.map(input)}</div>
        </details>
      ))}
    </>
  );
}
