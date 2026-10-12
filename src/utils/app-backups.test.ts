import { describe, expect, test } from "bun:test";
import type { AppBackup } from "../api";
import {
  appSupportsBackups,
  groupBackupRuns,
  hasActiveRun,
  runState,
} from "./app-backups";

const backup = (
  id: number,
  run_id: string,
  extra: Partial<AppBackup> = {},
): AppBackup => ({
  id,
  run_id,
  service: "db",
  method: "volume",
  artifact: `a${id}.tar.gz`,
  state: "completed",
  scheduled: false,
  created: "2026-10-12T10:00:00Z",
  ...extra,
});

describe("runState", () => {
  test("in-flight beats failed beats completed", () => {
    expect(
      runState([backup(1, "r"), backup(2, "r", { state: "running" })]),
    ).toBe("running");
    expect(
      runState([
        backup(1, "r", { state: "pending" }),
        backup(2, "r", { state: "failed" }),
      ]),
    ).toBe("pending");
    expect(
      runState([backup(1, "r"), backup(2, "r", { state: "failed" })]),
    ).toBe("failed");
    expect(runState([backup(1, "r")])).toBe("completed");
  });
});

describe("groupBackupRuns", () => {
  test("groups artifacts by run, newest run first, summing sizes", () => {
    const runs = groupBackupRuns([
      backup(1, "old", {
        created: "2026-10-10T03:00:00Z",
        size_bytes: 10,
        scheduled: true,
      }),
      backup(2, "new", { created: "2026-10-12T10:00:01Z", size_bytes: 5 }),
      backup(3, "new", {
        created: "2026-10-12T10:00:00Z",
        size_bytes: null,
        state: "failed",
      }),
    ]);
    expect(runs.map((r) => r.run_id)).toEqual(["new", "old"]);
    expect(runs[0]!.backups.map((b) => b.id)).toEqual([2, 3]);
    expect(runs[0]!.size_bytes).toBe(5);
    expect(runs[0]!.created).toBe("2026-10-12T10:00:00Z");
    expect(runs[0]!.state).toBe("failed");
    expect(runs[1]!.scheduled).toBe(true);
    expect(hasActiveRun(runs)).toBe(false);
    expect(
      hasActiveRun(groupBackupRuns([backup(4, "x", { state: "pending" })])),
    ).toBe(true);
  });
});

describe("appSupportsBackups", () => {
  test("reads the services' backup methods", () => {
    expect(
      appSupportsBackups(
        'services:\n  a:\n    image: x\n    user: "1000"\n    volumes:\n      - { name: d, path: /d, size: 1Gi }\n    backup: { volume: d }\n',
      ),
    ).toBe(true);
    expect(appSupportsBackups("services:\n  a:\n    image: x\n")).toBe(false);
    expect(appSupportsBackups(": : :")).toBe(true);
  });
});
