import { AppDeployment } from "../api";

/**
 * Where a deployment is in its life, as one value.
 *
 * The page used to gate its sections on `status` alone, which cannot express
 * "never paid for": the operator writes a never-paid deployment back as
 * `stopped` with prose in `status_message`, so after the first reconcile the
 * payment prompt disappeared, the resize form quoted pro-rata against a period
 * nobody had bought, and a **Start** button appeared whose request the API's
 * billing gate refuses (`LNVPS/web#54`). `billing_state` (`LNVPS/api#253`) is
 * the missing half.
 */
export type DeploymentLifecycle =
  | "deleting"
  | "unpaid"
  | "expired"
  | "error"
  | "deploying"
  | "running"
  | "stopped";

export function deploymentLifecycle(d: AppDeployment): DeploymentLifecycle {
  // Deletion outranks everything else: it is already happening, and what the
  // subscription says no longer changes what the customer can do about it.
  if (d.status === "deleting") return "deleting";

  // Billing outranks operator status — the whole point of api#253. Both of
  // these can arrive on a deployment the operator reports as `stopped`.
  if (d.billing_state === "unpaid") return "unpaid";
  if (d.billing_state === "expired") return "expired";

  // Absent or null `billing_state` means the subscription could not be
  // resolved, which is an operational fault and not a billing verdict. Fall
  // through to the operator's view rather than asking a paying customer to pay
  // again — and note this is also what an API older than #253 produces, where
  // the bug above is simply not fixable.
  if (d.status === "error") return "error";
  if (d.status === "running") return "running";
  if (d.status === "pending") return "deploying";

  // Asked to run and not running yet: the window between a payment landing and
  // the operator reporting `running`. This is the case that used to render as
  // a stopped app with a Start button.
  if (d.desired_state === "running") return "deploying";

  return "stopped";
}

/**
 * How one step of the lifecycle progress renders: already behind the
 * deployment, the one it is at, or still ahead of it.
 *
 * The last step is `done` rather than `current` when the deployment reaches
 * it. Nothing follows `running`, so drawing it as the step in progress leaves
 * a finished deployment showing two of three marks complete.
 */
export type LifecycleStepState = "done" | "current" | "todo";

export function lifecycleStepState(
  index: number,
  at: number,
  total: number,
): LifecycleStepState {
  if (index < at) return "done";
  if (index > at) return "todo";
  return at === total - 1 ? "done" : "current";
}

/** Sections the customer can act on, per lifecycle state. */
export interface DeploymentPermissions {
  /** Resize. Hidden wherever there is no paid period to prorate against. */
  size: boolean;
  stop: boolean;
  start: boolean;
  /**
   * Delete is available in every state except one already deleting: someone
   * who ordered by mistake must be able to remove it without paying first, and
   * an expired deployment must be removable without renewing it first.
   */
  delete: boolean;
  /** Whether the config form can be saved, as opposed to shown read-only. */
  configEditable: boolean;
}

export function deploymentPermissions(
  lifecycle: DeploymentLifecycle,
): DeploymentPermissions {
  return {
    size: lifecycle === "running" || lifecycle === "stopped",
    stop: lifecycle === "running",
    start: lifecycle === "stopped",
    delete: lifecycle !== "deleting",
    configEditable:
      lifecycle === "deploying" ||
      lifecycle === "running" ||
      lifecycle === "stopped" ||
      lifecycle === "error",
  };
}

/**
 * A usage bar's colour tier: steady below 70% of quota, worth a glance from
 * 70%, and the reading a customer needs to act on from 90%.
 */
export type UsageLevel = "normal" | "warning" | "critical";

export interface UsageBarReading {
  /** 0-100, clamped so a reading past quota still draws a full bar. */
  pct: number;
  level: UsageLevel;
}

/**
 * A usage bar's percentage and colour tier, or `null` when the quota side is
 * zero and there is no proportion to show.
 */
export function usageBarReading(
  used: number,
  quota: number,
): UsageBarReading | null {
  if (quota <= 0) return null;
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const level: UsageLevel =
    pct >= 90 ? "critical" : pct >= 70 ? "warning" : "normal";
  return { pct, level };
}
