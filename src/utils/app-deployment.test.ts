import { describe, expect, test } from "bun:test";
import { lifecycleStepState } from "./app-deployment";

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
