import { Link, useLocation } from "react-router-dom";
import { VmInstance, VmHistory } from "../api";
import useLogin from "../hooks/login";
import { useEffect, useState } from "react";

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  ).replace(/[-_]/g, ' ');
}

function getInitiatedByColor(initiatedBy: string): string {
  switch (initiatedBy) {
    case 'owner':
      return 'text-blue-400';
    case 'system':
      return 'text-yellow-400';
    case 'other':
      return 'text-purple-400';
    default:
      return 'text-neutral-400';
  }
}

function getActionTypeColor(actionType: string): string {
  const type = actionType.toLowerCase();
  if (type.includes('create')) {
    return 'text-slate-400 border-slate-500';
  }
  if (type.includes('start') || type.includes('provision')) {
    return 'text-green-400 border-green-500';
  }
  if (type.includes('stop') || type.includes('delete') || type.includes('remove')) {
    return 'text-red-400 border-red-500';
  }
  if (type.includes('restart') || type.includes('reboot')) {
    return 'text-orange-400 border-orange-500';
  }
  if (type.includes('reinstall') || type.includes('rebuild')) {
    return 'text-purple-400 border-purple-500';
  }
  if (type.includes('update') || type.includes('modify') || type.includes('change') || type.includes('patch')) {
    return 'text-blue-400 border-blue-500';
  }
  if (type.includes('payment') || type.includes('renew') || type.includes('billing')) {
    return 'text-yellow-400 border-yellow-500';
  }
  // Default color
  return 'text-neutral-400 border-neutral-500';
}

function JsonDiff({ previous, current }: { previous: string; current: string }) {
  try {
    const prevObj = JSON.parse(previous);
    const currObj = JSON.parse(current);
    
    const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);
    const changes: Array<{ key: string; from: any; to: any; type: 'added' | 'removed' | 'changed' }> = [];
    
    allKeys.forEach(key => {
      const prevValue = prevObj[key];
      const currValue = currObj[key];
      
      if (!(key in prevObj)) {
        changes.push({ key, from: undefined, to: currValue, type: 'added' });
      } else if (!(key in currObj)) {
        changes.push({ key, from: prevValue, to: undefined, type: 'removed' });
      } else if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes.push({ key, from: prevValue, to: currValue, type: 'changed' });
      }
    });
    
    if (changes.length === 0) {
      return <div className="text-neutral-400 text-sm">No changes detected</div>;
    }
    
    return (
      <div className="space-y-2">
        {changes.map(({ key, from, to, type }) => (
          <div key={key} className="text-sm">
            <div className="font-medium text-neutral-300">{key}:</div>
            <div className="ml-4 space-y-1">
              {type === 'added' && (
                <div className="text-green-400">+ {JSON.stringify(to)}</div>
              )}
              {type === 'removed' && (
                <div className="text-red-400">- {JSON.stringify(from)}</div>
              )}
              {type === 'changed' && (
                <>
                  <div className="text-red-400">- {JSON.stringify(from)}</div>
                  <div className="text-green-400">+ {JSON.stringify(to)}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="text-red-400 text-sm">
        Error parsing JSON: {error instanceof Error ? error.message : 'Unknown error'}
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
        <div className="text-red-500">No VM selected</div>
        <Link to="/" className="text-blue-400 hover:text-blue-300">
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

      <div className="bg-neutral-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">VM: {state.template.name}</h2>
        <div className="text-sm text-neutral-400">ID: {state.id}</div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="text-neutral-400">Loading history...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg">
          <div className="text-red-200">Error loading history: {error}</div>
        </div>
      )}

      {history && history.length === 0 && (
        <div className="bg-neutral-800 p-8 rounded-lg text-center text-neutral-400">
          No history entries found for this VM.
        </div>
      )}

      {history && history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">History Events</h3>
          <div className="space-y-2">
            {history.map((entry) => {
              const colorClasses = getActionTypeColor(entry.action_type);
              const [textColor, borderColor] = colorClasses.split(' ');
              
              return (
                <div
                  key={entry.id}
                  className={`bg-neutral-800 p-4 rounded-lg border-l-4 ${borderColor}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className={`font-medium ${textColor}`}>
                        {toTitleCase(entry.action_type)}
                      </span>
                      <span className={`text-xs ${getInitiatedByColor(entry.initiated_by)}`}>
                        by {entry.initiated_by}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                {entry.description && (
                  <div className="text-sm text-neutral-300 mt-2">
                    {entry.description}
                  </div>
                )}
                
                {entry.previous_state && entry.new_state && (
                  <div className="mt-3 p-3 bg-neutral-900 rounded">
                    <div className="text-sm font-medium text-neutral-300 mb-2">Configuration Changes:</div>
                    <JsonDiff previous={entry.previous_state} current={entry.new_state} />
                  </div>
                )}
                
                {entry.metadata && (
                  <div className="text-xs text-neutral-400 mt-1">
                    <details>
                      <summary className="cursor-pointer">Metadata</summary>
                      <pre className="mt-1 p-2 bg-neutral-900 rounded overflow-x-auto">
                        {entry.metadata}
                      </pre>
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