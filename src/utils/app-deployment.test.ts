import { describe, expect, test } from "bun:test";
import { AppDeploymentUsage } from "../api";
import {
  lifecycleStepState,
  usageBarReading,
  usageBreakdown,
} from "./app-deployment";

describe("lifecycleStepState", () => {
  test("marks the last step done once the deployment reaches it", () => {
    expect(lifecycleStepState(0, 2, 3)).toBe("done");
    expect(lifecycleStepState(1, 2, 3)).toBe("done");
    expect(lifecycleStepState(2, 2, 3)).toBe("done");
  });

  test("keeps a step in the middle current, with the rest still ahead", () => {
    expect(lifecycleStepState(0, 1, 3)).toBe("done");
    expect(lifecycleStepState(1, 1, 3)).toBe("current");
    expect(lifecycleStepState(2, 1, 3)).toBe("todo");
  });

  test("marks nothing done at the first step", () => {
    expect(lifecycleStepState(0, 0, 3)).toBe("current");
    expect(lifecycleStepState(1, 0, 3)).toBe("todo");
  });
});

describe("usageBarReading", () => {
  test("hides the bar when quota is zero, whatever was used", () => {
    expect(usageBarReading(0, 0)).toBeNull();
    expect(usageBarReading(5, 0)).toBeNull();
  });

  test("clamps a reading past quota to a full bar, still critical", () => {
    expect(usageBarReading(150, 100)).toEqual({ pct: 100, level: "critical" });
  });

  test("picks the tier at the 70 and 90 boundaries", () => {
    expect(usageBarReading(69, 100)).toEqual({ pct: 69, level: "normal" });
    expect(usageBarReading(70, 100)).toEqual({ pct: 70, level: "warning" });
    expect(usageBarReading(89, 100)).toEqual({ pct: 89, level: "warning" });
    expect(usageBarReading(90, 100)).toEqual({ pct: 90, level: "critical" });
  });
});

describe("usageBreakdown", () => {
  // Regression: a reading stored before the per-service/volume split shipped
  // has only the totals, and DeploymentUsageCard crashed reading
  // `usage.services.length` of `undefined`.
  test("normalises absent services/volumes to empty arrays", () => {
    const totalsOnly: AppDeploymentUsage = {
      cpu_milli: 500,
      memory_bytes: 1024,
      collected: "2026-01-01T00:00:00Z",
    };
    expect(usageBreakdown(totalsOnly)).toEqual({ services: [], volumes: [] });
  });

  test("passes a full reading through untouched", () => {
    const services: AppDeploymentUsage["services"] = [
      { service: "web", cpu_milli: 500, memory_bytes: 1024 },
    ];
    const volumes: AppDeploymentUsage["volumes"] = [
      { service: "web", name: "data", storage_bytes: 2048 },
    ];
    const full: AppDeploymentUsage = {
      cpu_milli: 500,
      memory_bytes: 1024,
      storage_bytes: 2048,
      collected: "2026-01-01T00:00:00Z",
      services,
      volumes,
    };
    expect(usageBreakdown(full).services).toBe(services);
    expect(usageBreakdown(full).volumes).toBe(volumes);
  });
});
