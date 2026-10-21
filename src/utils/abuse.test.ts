import { describe, expect, test } from "bun:test";
import { AbuseAction } from "../api";
import { canChallenge, challengeWindowClosed } from "./abuse";

const NOW = Date.parse("2026-10-21T12:00:00Z");

function action(over: Partial<AbuseAction>): AbuseAction {
  return {
    id: 1,
    kind: "suspended",
    reason: "r",
    facts: "f",
    legal_basis: null,
    followed_report: true,
    created: "2026-10-01T00:00:00Z",
    challenge_until: "2027-04-02T00:00:00Z",
    ...over,
  };
}

describe("canChallenge", () => {
  test("is open inside the window", () => {
    expect(canChallenge(action({}), NOW)).toBe(true);
  });

  test("is open on the last day", () => {
    expect(
      canChallenge(action({ challenge_until: "2026-10-21T12:00:00Z" }), NOW),
    ).toBe(true);
  });

  test("closes once the deadline has passed", () => {
    expect(
      canChallenge(action({ challenge_until: "2026-10-21T11:59:59Z" }), NOW),
    ).toBe(false);
  });

  test("a decision to take no action has nothing to challenge", () => {
    expect(canChallenge(action({ kind: "no_action" }), NOW)).toBe(false);
  });
});

describe("challengeWindowClosed", () => {
  test("is true only for a real decision past its deadline", () => {
    const late = action({ challenge_until: "2026-01-01T00:00:00Z" });
    expect(challengeWindowClosed(late, NOW)).toBe(true);
    expect(challengeWindowClosed(action({}), NOW)).toBe(false);
    expect(
      challengeWindowClosed(
        action({ kind: "no_action", challenge_until: "2026-01-01T00:00:00Z" }),
        NOW,
      ),
    ).toBe(false);
  });
});
