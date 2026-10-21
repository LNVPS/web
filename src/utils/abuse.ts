import { AbuseAction } from "../api";

export function canChallenge(action: AbuseAction, now = Date.now()): boolean {
  return (
    action.kind !== "no_action" &&
    new Date(action.challenge_until).getTime() >= now
  );
}

export function challengeWindowClosed(
  action: AbuseAction,
  now = Date.now(),
): boolean {
  return action.kind !== "no_action" && !canChallenge(action, now);
}
