import Markdown from "../components/markdown";
import Status from "../status.json";

export function StatusPage() {
  const totalDowntime = Status.events.reduce((acc, v) => {
    if (v.end_time) {
      const end = new Date(v.end_time);
      const start = new Date(v.start_time);
      const duration = end.getTime() - start.getTime();
      acc += duration;
    }
    return acc;
  }, 0);
  const birth = new Date(Status.birth);
  const now = new Date();
  const age = now.getTime() - birth.getTime();
  const uptime = 1 - totalDowntime / age;

  function formatDuration(n: number) {
    if (n > 3600) {
      return `${(n / 3600).toFixed(0)}h ${((n % 3600) / 60).toFixed(0)}m`;
    } else if (n > 60) {
      return `${(n % 60).toFixed(0)}m`;
    } else {
      return `${n.toFixed(0)}s`;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Uptime: {(100 * uptime).toFixed(5)}%</div>

      <div className="text-xl">Incidents:</div>
      {Status.events.map((e) => {
        const end = e.end_time ? new Date(e.end_time) : undefined;
        const start = new Date(e.start_time);
        const duration = end ? end.getTime() - start.getTime() : undefined;

        return (
          <div className="rounded-xl bg-neutral-900 px-3 py-4 flex flex-col gap-2">
            <div className="text-xl flex justify-between">
              <div>{e.title}</div>
              <div>{new Date(e.start_time).toLocaleString()}</div>
            </div>
            {duration && (
              <div className="text-sm text-neutral-400">
                Duration: {formatDuration(duration / 1000)}
              </div>
            )}
            <Markdown content={e.description} />
          </div>
        );
      })}
    </div>
  );
}
