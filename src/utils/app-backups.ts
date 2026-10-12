import { parseCompose } from "lnvps-compose";
import type { AppBackup, AppBackupState } from "../api";

export interface AppBackupRun {
  run_id: string;
  created: string;
  scheduled: boolean;
  state: AppBackupState;
  size_bytes: number;
  backups: Array<AppBackup>;
}

export function runState(backups: ReadonlyArray<AppBackup>): AppBackupState {
  if (backups.some((b) => b.state === "running")) return "running";
  if (backups.some((b) => b.state === "pending")) return "pending";
  if (backups.some((b) => b.state === "failed")) return "failed";
  return "completed";
}

export function groupBackupRuns(
  backups: ReadonlyArray<AppBackup>,
): Array<AppBackupRun> {
  const runs: Array<AppBackupRun> = [];
  for (const b of backups) {
    let run = runs.find((r) => r.run_id === b.run_id);
    if (!run) {
      run = {
        run_id: b.run_id,
        created: b.created,
        scheduled: b.scheduled,
        state: b.state,
        size_bytes: 0,
        backups: [],
      };
      runs.push(run);
    }
    run.backups.push(b);
    run.size_bytes += b.size_bytes ?? 0;
    if (b.created < run.created) run.created = b.created;
  }
  for (const run of runs) run.state = runState(run.backups);
  return runs.sort((a, b) => (a.created < b.created ? 1 : -1));
}

export function hasActiveRun(runs: ReadonlyArray<AppBackupRun>): boolean {
  return runs.some((r) => r.state === "pending" || r.state === "running");
}

export function appSupportsBackups(compose: string): boolean {
  try {
    return Object.values(parseCompose(compose).services).some(
      (s) => s.backup !== undefined,
    );
  } catch {
    return true;
  }
}
