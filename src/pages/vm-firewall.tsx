import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  VmInstance,
  FirewallRule,
  FirewallPolicy,
  FirewallDirection,
  FirewallProtocol,
  FirewallAction,
  CreateFirewallRule,
} from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import Seo from "../components/seo";

const RULE_LIMIT = 20;

type FormMode = "closed" | "new" | number;

const selectClass =
  "bg-cyber-panel border border-cyber-border rounded-sm px-2 py-1 text-sm text-cyber-text focus:border-cyber-primary outline-none";
const inputClass =
  "bg-cyber-panel border border-cyber-border rounded-sm px-2 py-1 text-sm text-cyber-text focus:border-cyber-primary outline-none w-full";

function actionColor(action: FirewallAction): string {
  switch (action) {
    case FirewallAction.ACCEPT:
      return "text-cyber-primary border-cyber-primary";
    case FirewallAction.DROP:
      return "text-cyber-warning border-cyber-warning";
    case FirewallAction.REJECT:
      return "text-cyber-danger border-cyber-danger";
    default:
      return "text-cyber-muted border-cyber-border";
  }
}

type ParsedPorts = { start: number | null; end: number | null } | "invalid";

function parsePorts(text: string): ParsedPorts {
  const trimmed = text.trim();
  if (trimmed === "") return { start: null, end: null };

  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 65535;

  const parts = trimmed.split("-").map((p) => p.trim());
  if (parts.length === 1) {
    const n = Number(parts[0]);
    if (!inRange(n)) return "invalid";
    return { start: n, end: null };
  }
  if (parts.length === 2) {
    const start = Number(parts[0]);
    const end = Number(parts[1]);
    if (!inRange(start) || !inRange(end) || start > end) return "invalid";
    return { start, end };
  }
  return "invalid";
}

function portsToText(rule: FirewallRule): string {
  if (rule.dst_port_start == null) return "";
  if (rule.dst_port_end == null || rule.dst_port_end === rule.dst_port_start) {
    return `${rule.dst_port_start}`;
  }
  return `${rule.dst_port_start}-${rule.dst_port_end}`;
}

function emptyRule(): CreateFirewallRule {
  return {
    direction: FirewallDirection.INBOUND,
    protocol: FirewallProtocol.TCP,
    action: FirewallAction.ACCEPT,
    src_cidr: "",
    dst_port_start: undefined,
    dst_port_end: undefined,
    enabled: true,
  };
}

export function VmFirewallPage() {
  const { state } = useLocation() as { state?: VmInstance };
  const login = useLogin();

  const [rules, setRules] = useState<Array<FirewallRule>>();
  const [policy, setPolicy] = useState<FirewallPolicy>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [draft, setDraft] = useState<CreateFirewallRule>(emptyRule());
  const [portText, setPortText] = useState("");
  const [policyStatus, setPolicyStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");

  async function reload() {
    if (!state || !login?.api) return;
    setLoading(true);
    setError(undefined);
    try {
      const [r, p] = await Promise.all([
        login.api.listFirewallRules(state.id),
        login.api.getFirewallPolicy(state.id),
      ]);
      setRules(r.sort((a, b) => a.priority - b.priority));
      setPolicy(p);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, login]);

  function openNew() {
    setDraft(emptyRule());
    setPortText("");
    setError(undefined);
    setFormMode("new");
  }

  function openEdit(rule: FirewallRule) {
    setDraft({
      priority: rule.priority,
      direction: rule.direction,
      protocol: rule.protocol,
      action: rule.action,
      src_cidr: rule.src_cidr ?? "",
      enabled: rule.enabled,
    });
    setPortText(portsToText(rule));
    setError(undefined);
    setFormMode(rule.id);
  }

  function closeForm() {
    setFormMode("closed");
    setDraft(emptyRule());
    setPortText("");
  }

  async function savePolicy(patch: FirewallPolicy) {
    if (!state || !login?.api) return;
    setError(undefined);
    setPolicyStatus("saving");
    try {
      const p = await login.api.updateFirewallPolicy(state.id, patch);
      setPolicy(p);
      setPolicyStatus("saved");
      setTimeout(() => setPolicyStatus("idle"), 2500);
    } catch (e) {
      setPolicyStatus("idle");
      if (e instanceof Error) setError(e.message);
    }
  }

  async function toggleRule(rule: FirewallRule) {
    if (!state || !login?.api) return;
    setError(undefined);
    try {
      const updated = await login.api.updateFirewallRule(state.id, rule.id, {
        enabled: !rule.enabled,
      });
      setRules((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function deleteRule(rule: FirewallRule) {
    if (!state || !login?.api) return;
    if (
      !confirm(
        `Delete firewall rule #${rule.id}? This will queue a firewall re-apply.`,
      )
    )
      return;
    setError(undefined);
    try {
      await login.api.deleteFirewallRule(state.id, rule.id);
      setRules((prev) => prev?.filter((r) => r.id !== rule.id));
      if (formMode === rule.id) closeForm();
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function saveRule() {
    if (!state || !login?.api || formMode === "closed") return;
    setError(undefined);

    const port = parsePorts(portText);
    if (port === "invalid") {
      setError(
        "Invalid port. Enter a single port (e.g. 22) or a range (e.g. 8000-8100).",
      );
      return;
    }

    const req: CreateFirewallRule = {
      ...draft,
      src_cidr: draft.src_cidr?.trim() ? draft.src_cidr.trim() : null,
      dst_port_start: port.start,
      dst_port_end: port.end,
    };

    try {
      if (formMode === "new") {
        const created = await login.api.createFirewallRule(state.id, req);
        setRules((prev) =>
          [...(prev ?? []), created].sort((a, b) => a.priority - b.priority),
        );
      } else {
        const updated = await login.api.updateFirewallRule(
          state.id,
          formMode,
          req,
        );
        setRules((prev) =>
          prev
            ?.map((r) => (r.id === updated.id ? updated : r))
            .sort((a, b) => a.priority - b.priority),
        );
      }
      closeForm();
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  function ruleForm(submitLabel: React.ReactNode) {
    return (
      <div className="bg-cyber-panel-light p-4 rounded-sm flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Priority" />
            <input
              type="number"
              className={inputClass}
              value={draft.priority ?? ""}
              placeholder="auto"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priority: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Direction" />
            <select
              className={selectClass}
              value={draft.direction}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  direction: e.target.value as FirewallDirection,
                })
              }
            >
              <option value={FirewallDirection.INBOUND}>inbound</option>
              <option value={FirewallDirection.OUTBOUND}>outbound</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Protocol" />
            <select
              className={selectClass}
              value={draft.protocol}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  protocol: e.target.value as FirewallProtocol,
                })
              }
            >
              <option value={FirewallProtocol.ANY}>any</option>
              <option value={FirewallProtocol.TCP}>tcp</option>
              <option value={FirewallProtocol.UDP}>udp</option>
              <option value={FirewallProtocol.ICMP}>icmp</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Action" />
            <select
              className={selectClass}
              value={draft.action}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  action: e.target.value as FirewallAction,
                })
              }
            >
              <option value={FirewallAction.ACCEPT}>accept</option>
              <option value={FirewallAction.DROP}>drop</option>
              <option value={FirewallAction.REJECT}>reject</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            {draft.direction === FirewallDirection.OUTBOUND ? (
              <FormattedMessage defaultMessage="Source CIDR (this VM)" />
            ) : (
              <FormattedMessage defaultMessage="Source CIDR" />
            )}
            <input
              className={inputClass}
              value={draft.src_cidr ?? ""}
              placeholder="any"
              onChange={(e) => setDraft({ ...draft, src_cidr: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Port(s)" />
            <input
              className={inputClass}
              value={portText}
              placeholder="any, 22, or 8000-8100"
              onChange={(e) => setPortText(e.target.value)}
            />
          </label>
        </div>
        {draft.direction === FirewallDirection.OUTBOUND && (
          <div className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="For outbound rules, Source CIDR matches this VM's own address. The remote destination host cannot be restricted — only protocol and destination port." />
          </div>
        )}
        <div className="flex gap-2">
          <AsyncButton
            className="bg-cyber-primary text-cyber-darker"
            onClick={saveRule}
          >
            {submitLabel}
          </AsyncButton>
          <AsyncButton onClick={closeForm}>
            <FormattedMessage defaultMessage="Cancel" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col gap-2">
        <h1>
          <FormattedMessage defaultMessage="Firewall" />
        </h1>
        <div className="text-cyber-danger">
          <FormattedMessage defaultMessage="No VM selected" />
        </div>
      </div>
    );
  }

  const atLimit = (rules?.length ?? 0) >= RULE_LIMIT;

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">
          <FormattedMessage defaultMessage="Firewall" />
        </h2>
        <span className="text-xs text-cyber-muted">
          <FormattedMessage
            defaultMessage="{count} / {max} rules"
            values={{ count: rules?.length ?? 0, max: RULE_LIMIT }}
          />
        </span>
      </div>

      {error && (
        <div className="bg-cyber-danger/10 border border-cyber-danger p-3 rounded-sm text-cyber-danger text-sm">
          {error}
        </div>
      )}

      {/* Default policy */}
      <div className="bg-cyber-panel-light p-4 rounded-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-cyber-text">
            <FormattedMessage defaultMessage="Default Policy" />
          </div>
          {policyStatus === "saving" && (
            <span className="text-xs text-cyber-muted">
              <FormattedMessage defaultMessage="Saving…" />
            </span>
          )}
          {policyStatus === "saved" && (
            <span className="text-xs text-cyber-primary">
              <FormattedMessage defaultMessage="Saved ✓" />
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Inbound" />
            <select
              className={selectClass}
              value={policy?.policy_in ?? ""}
              onChange={(e) =>
                savePolicy({
                  policy_in: e.target.value
                    ? (e.target.value as FirewallAction)
                    : null,
                })
              }
            >
              <option value="">host default (allow-all)</option>
              <option value={FirewallAction.ACCEPT}>accept</option>
              <option value={FirewallAction.DROP}>drop</option>
              <option value={FirewallAction.REJECT}>reject</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Outbound" />
            <select
              className={selectClass}
              value={policy?.policy_out ?? ""}
              onChange={(e) =>
                savePolicy({
                  policy_out: e.target.value
                    ? (e.target.value as FirewallAction)
                    : null,
                })
              }
            >
              <option value="">host default (allow-all)</option>
              <option value={FirewallAction.ACCEPT}>accept</option>
              <option value={FirewallAction.DROP}>drop</option>
              <option value={FirewallAction.REJECT}>reject</option>
            </select>
          </label>
        </div>
        <div className="text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Rules are evaluated in priority order (lowest first) before the default policy. Anti-spoofing protection is always enforced by the host." />
        </div>
      </div>

      {loading && (
        <div className="text-cyber-muted text-sm py-4">
          <FormattedMessage defaultMessage="Loading firewall..." />
        </div>
      )}

      {/* Rules list */}
      {rules && rules.length === 0 && !loading && (
        <div className="bg-cyber-panel-light p-6 rounded-sm text-center text-cyber-muted text-sm">
          <FormattedMessage defaultMessage="No firewall rules. The default policy applies." />
        </div>
      )}

      {rules && rules.length > 0 && (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => {
            const [textColor, borderColor] = actionColor(rule.action).split(
              " ",
            );
            const port =
              rule.dst_port_start == null
                ? "any"
                : rule.dst_port_end == null ||
                    rule.dst_port_end === rule.dst_port_start
                  ? `${rule.dst_port_start}`
                  : `${rule.dst_port_start}-${rule.dst_port_end}`;
            return (
              <div key={rule.id} className="flex flex-col gap-2">
                <div
                  className={`bg-cyber-panel-light p-3 rounded-sm border-l-4 ${borderColor} flex flex-wrap items-center gap-x-4 gap-y-1 ${
                    rule.enabled ? "" : "opacity-50"
                  }`}
                >
                  <span className="text-xs text-cyber-muted w-10">
                    #{rule.priority}
                  </span>
                  <span className="text-sm text-cyber-text w-20">
                    {rule.direction}
                  </span>
                  <span className="text-sm text-cyber-text w-14 uppercase">
                    {rule.protocol}
                  </span>
                  <span className={`text-sm font-medium w-16 ${textColor}`}>
                    {rule.action}
                  </span>
                  <span className="text-sm text-cyber-muted flex-1 min-w-[8rem]">
                    {rule.src_cidr || "any"} &rarr; :{port}
                  </span>
                  <div className="flex gap-2 items-center">
                    <AsyncButton
                      className="text-xs py-1 px-2"
                      onClick={() => openEdit(rule)}
                    >
                      <FormattedMessage defaultMessage="Edit" />
                    </AsyncButton>
                    <AsyncButton
                      className="text-xs py-1 px-2"
                      onClick={() => toggleRule(rule)}
                    >
                      {rule.enabled ? (
                        <FormattedMessage defaultMessage="Disable" />
                      ) : (
                        <FormattedMessage defaultMessage="Enable" />
                      )}
                    </AsyncButton>
                    <AsyncButton
                      className="text-xs py-1 px-2 hover:!text-cyber-danger hover:!border-cyber-danger"
                      onClick={() => deleteRule(rule)}
                    >
                      <FormattedMessage defaultMessage="Delete" />
                    </AsyncButton>
                  </div>
                </div>
                {formMode === rule.id &&
                  ruleForm(<FormattedMessage defaultMessage="Save" />)}
              </div>
            );
          })}
        </div>
      )}

      {/* Add rule */}
      {formMode !== "new" && (
        <AsyncButton
          className="self-start"
          disabled={atLimit}
          onClick={openNew}
        >
          <FormattedMessage defaultMessage="Add Rule" />
        </AsyncButton>
      )}
      {atLimit && formMode !== "new" && (
        <div className="text-xs text-cyber-warning">
          <FormattedMessage defaultMessage="Rule limit reached." />
        </div>
      )}

      {formMode === "new" && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-cyber-text">
            <FormattedMessage defaultMessage="New Rule" />
          </div>
          {ruleForm(<FormattedMessage defaultMessage="Create" />)}
        </div>
      )}
    </div>
  );
}
