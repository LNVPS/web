import { describe, expect, test } from "bun:test";
import { lifecycleStepState, usageBarReading } from "./app-deployment";

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
