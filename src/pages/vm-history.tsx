import { Link, useLocation } from "react-router-dom";
import { VmInstance, VmHistory } from "../api";
import useLogin from "../hooks/login";
import { useEffect, useState } from "react";

function toTitleCase(str: string): string {
  return str
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    )
    .replace(/[-_]/g, " ");
}

function getInitiatedByColor(initiatedBy: string): string {
  switch (initiatedBy) {
    case "owner":
      return "text-cyber-accent";
    case "system":
      return "text-cyber-warning";
    case "other":
      return "text-cyber-accent";
    default:
      return "text-cyber-muted";
  }
}

function getActionTypeColor(actionType: string): string {
  const type = actionType.toLowerCase();
  if (type.includes("create")) {
    return "text-cyber-muted border-cyber-border";
  }
  if (type.includes("start") || type.includes("provision")) {
    return "text-cyber-primary border-cyber-primary";
  }
  if (
    type.includes("stop") ||
    type.includes("delete") ||
    type.includes("remove")
  ) {
    return "text-cyber-danger border-cyber-danger";
  }
  if (type.includes("restart") || type.includes("reboot")) {
    return "text-cyber-warning border-cyber-warning";
  }
  if (type.includes("reinstall") || type.includes("rebuild")) {
    return "text-cyber-accent border-cyber-accent";
  }
  if (
    type.includes("update") ||
    type.includes("modify") ||
    type.includes("change") ||
    type.includes("patch")
  ) {
    return "text-cyber-accent border-cyber-accent";
  }
  if (
    type.includes("payment") ||
    type.includes("renew") ||
    type.includes("billing")
  ) {
    return "text-cyber-warning border-cyber-warning";
  }
  // Default color
  return "text-cyber-muted border-cyber-border";
}

function JsonDiff({
  previous,
  current,
}: {
  previous: string;
  current: string;
}) {
  try {
    const prevObj = JSON.parse(previous);
    const currObj = JSON.parse(current);

    const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);
    const changes: Array<{
      key: string;
      from: any;
      to: any;
      type: "added" | "removed" | "changed";
    }> = [];

    allKeys.forEach((key) => {
      const prevValue = prevObj[key];
      const currValue = currObj[key];

      if (!(key in prevObj)) {
        changes.push({ key, from: undefined, to: currValue, type: "added" });
      } else if (!(key in currObj)) {
        changes.push({ key, from: prevValue, to: undefined, type: "removed" });
      } else if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes.push({ key, from: prevValue, to: currValue, type: "changed" });
      }
    });

    if (changes.length === 0) {
      return (
        <div className="text-cyber-muted text-sm">No changes detected</div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map(({ key, from, to, type }) => (
          <div key={key} className="text-sm">
            <div className="font-medium text-cyber-text">{key}:</div>
            <div className="ml-4 space-y-1">
              {type === "added" && (
                <div className="text-cyber-primary">+ {JSON.stringify(to)}</div>
              )}
              {type === "removed" && (
                <div className="text-cyber-danger">
                  - {JSON.stringify(from)}
                </div>
              )}
              {type === "changed" && (
                <>
                  <div className="text-cyber-danger">
                    - {JSON.stringify(from)}
                  </div>
                  <div className="text-cyber-primary">
                    + {JSON.stringify(to)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="text-cyber-danger text-sm">
        Error parsing JSON:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }
}

export function VmHistoryPage() {
  const { state } = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const [history, setHistory] = useState<Array<VmHistory>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!state || !login?.api) return;

    login.api
      .getVmHistory(state.id)
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [state, login]);

  if (!state) {
    return (
      <div className="flex flex-col gap-2">
        <h1>VM History</h1>
        <div className="text-cyber-danger">No VM selected</div>
        <Link to="/" className="text-cyber-accent hover:text-cyber-accent">
          Go back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to={"/vm"} state={state}>
        &lt; Back
      </Link>

      <div className="bg-cyber-panel-light p-4 rounded-sm">
        <h2 className="text-lg font-semibold mb-2">
          VM: {state.template.name}
        </h2>
        <div className="text-sm text-cyber-muted">ID: {state.id}</div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="text-cyber-muted">Loading history...</div>
        </div>
      )}

      {error && (
        <div className="bg-cyber-danger/10 border border-cyber-danger p-4 rounded-sm">
          <div className="text-cyber-danger">
            Error loading history: {error}
          </div>
        </div>
      )}

      {history && history.length === 0 && (
        <div className="bg-cyber-panel-light p-8 rounded-sm text-center text-cyber-muted">
          No history entries found for this VM.
        </div>
      )}

      {history && history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">History Events</h3>
          <div className="space-y-2">
            {history.map((entry) => {
              const colorClasses = getActionTypeColor(entry.action_type);
              const [textColor, borderColor] = colorClasses.split(" ");

              return (
                <div
                  key={entry.id}
                  className={`bg-cyber-panel-light p-4 rounded-sm border-l-4 ${borderColor}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className={`font-medium ${textColor}`}>
                        {toTitleCase(entry.action_type)}
                      </span>
                      <span
                        className={`text-xs ${getInitiatedByColor(entry.initiated_by)}`}
                      >
                        by {entry.initiated_by}
                      </span>
                    </div>
                    <span className="text-sm text-cyber-muted">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {entry.description && (
                    <div className="text-sm text-cyber-text mt-2">
                      {entry.description}
                    </div>
                  )}

                  {entry.previous_state && entry.new_state && (
                    <div className="mt-3 p-3 bg-cyber-panel rounded-sm">
                      <div className="text-sm font-medium text-cyber-text mb-2">
                        Configuration Changes:
                      </div>
                      <JsonDiff
                        previous={entry.previous_state}
                        current={entry.new_state}
                      />
                    </div>
                  )}

                  {entry.metadata && (
                    <div className="mt-3 p-3 bg-cyber-panel rounded-sm">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-cyber-text hover:text-cyber-text-bright">
                          Metadata
                        </summary>
                        <div className="mt-3 p-3 bg-cyber-darker/50 rounded-sm overflow-x-auto whitespace-pre">
                          {JSON.stringify(
                            JSON.parse(entry.metadata),
                            undefined,
                            2,
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
