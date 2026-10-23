import { CostPlanIntervalType, type VmCostPlan } from "../api";

export type BillingTone = "primary" | "warning" | "danger" | "muted";

export interface ExpiryStatus {
  /** True when there's no expiry yet (never paid / not provisioned). */
  isNew: boolean;
  expired: boolean;
  expiringSoon: boolean;
  tone: BillingTone;
  /** Fill percentage for the lease meter (0–100). */
  meterPct: number;
  /** Whole days remaining (0 when expired/new). */
  daysLeft: number;
  /** Seconds remaining (0 when expired/new). */
  secondsLeft: number;
  /**
   * The billing cycle is shorter than a day (hourly), so "N days left" would
   * read "0 days left" for the whole life of the lease. Show the time left.
   */
  subDay: boolean;
}

/** Length of one billing cycle in days, used to scale the expiry meter. */
export function planCycleDays(plan: VmCostPlan): number {
  const n = plan.interval_amount || 1;
  switch (plan.interval_type) {
    case CostPlanIntervalType.HOUR:
      return n / 24;
    case CostPlanIntervalType.DAY:
      return n;
    case CostPlanIntervalType.MONTH:
      return n * 30;
    case CostPlanIntervalType.YEAR:
      return n * 365;
    default:
      return 30;
  }
}

/** Derive status/tone/meter from an expiry date and the billing cycle length. */
export function expiryStatus(
  expires: string | undefined,
  cycleDays: number,
): ExpiryStatus {
  if (!expires) {
    return {
      isNew: true,
      expired: false,
      expiringSoon: false,
      tone: "muted",
      meterPct: 0,
      daysLeft: 0,
      secondsLeft: 0,
      subDay: cycleDays < 1,
    };
  }
  const days = (new Date(expires).getTime() - Date.now()) / 86_400_000;
  const expired = days <= 0;
  // "Soon" is three days out, except for a cycle too short for that to mean
  // anything: the server warns half a cycle ahead (30 minutes when hourly).
  const subDay = cycleDays < 1;
  const expiringSoon = !expired && days <= (subDay ? cycleDays / 2 : 3);
  return {
    subDay,
    secondsLeft: Math.max(0, Math.floor(days * 86_400)),
    isNew: false,
    expired,
    expiringSoon,
    tone: expired ? "danger" : expiringSoon ? "warning" : "primary",
    meterPct: expired
      ? 100
      : Math.min(100, Math.max(4, (days / cycleDays) * 100)),
    daysLeft: Math.max(0, Math.floor(days)),
  };
}
