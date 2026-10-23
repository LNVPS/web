import {
  CostPlanIntervalType,
  CpuArch,
  CpuMfg,
  type VmCustomTemplateParams,
} from "../api";

/**
 * A custom-pricing template is priced at one billing interval, so a region
 * (and each CPU variant inside it) is offered as several templates, one per
 * interval. These helpers group them back together: the builder shows the
 * distinct intervals as tabs and hides the tabs when there is only one.
 */

export interface BillingInterval {
  type: CostPlanIntervalType;
  amount: number;
}

/** Approximate length of one unit, only used to order intervals. */
const UNIT_HOURS: Record<CostPlanIntervalType, number> = {
  [CostPlanIntervalType.HOUR]: 1,
  [CostPlanIntervalType.DAY]: 24,
  [CostPlanIntervalType.MONTH]: 24 * 30,
  [CostPlanIntervalType.YEAR]: 24 * 365,
};

/** The interval a template is priced at; monthly when the server omits it. */
export function templateInterval(t: VmCustomTemplateParams): BillingInterval {
  return {
    type: t.interval_type ?? CostPlanIntervalType.MONTH,
    amount: t.interval_amount ?? 1,
  };
}

/** Stable string identity of an interval, for state and React keys. */
export function intervalKey(i: BillingInterval): string {
  return `${i.amount}:${i.type}`;
}

function intervalLength(i: BillingInterval): number {
  return (UNIT_HOURS[i.type] ?? 0) * i.amount;
}

/**
 * The distinct intervals among `templates`, longest first (monthly, daily,
 * hourly), so the first one is the sensible default.
 */
export function distinctIntervals(
  templates: Array<VmCustomTemplateParams>,
): Array<BillingInterval> {
  const seen = new Map<string, BillingInterval>();
  for (const t of templates) {
    const i = templateInterval(t);
    seen.set(intervalKey(i), i);
  }
  return [...seen.values()].sort(
    (a, b) => intervalLength(b) - intervalLength(a),
  );
}

/**
 * Identity of a template's CPU constraints (maker, architecture, features).
 * Templates sharing it are the same machine offered at different intervals.
 */
export function cpuVariantKey(t: VmCustomTemplateParams): string {
  const mfg = t.cpu_mfg && t.cpu_mfg !== CpuMfg.UNKNOWN ? t.cpu_mfg : "";
  const arch = t.cpu_arch && t.cpu_arch !== CpuArch.UNKNOWN ? t.cpu_arch : "";
  return [mfg, arch, [...(t.cpu_features ?? [])].sort().join(",")].join("|");
}

/**
 * Assigns each template the key of the machine it belongs to: its CPU
 * constraints, so the same machine offered at several intervals shares one key.
 *
 * Two templates that agree on both CPU constraints *and* interval cannot be
 * told apart by the tab strip (a server that does not yet label intervals
 * sends exactly this), so they are kept as separate machines by adding the
 * template id. Otherwise the second would be unreachable.
 */
export function variantKeyFn(
  templates: Array<VmCustomTemplateParams>,
): (t: VmCustomTemplateParams) => string {
  const counts = new Map<string, number>();
  for (const t of templates) {
    const k = `${cpuVariantKey(t)}@${intervalKey(templateInterval(t))}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return (t) => {
    const clash =
      (counts.get(`${cpuVariantKey(t)}@${intervalKey(templateInterval(t))}`) ??
        0) > 1;
    return clash ? `${cpuVariantKey(t)}#${t.id}` : cpuVariantKey(t);
  };
}

/** One template per machine, in first-seen order, to label the CPU filter. */
export function cpuVariants(
  templates: Array<VmCustomTemplateParams>,
): Array<VmCustomTemplateParams> {
  const keyOf = variantKeyFn(templates);
  const seen = new Map<string, VmCustomTemplateParams>();
  for (const t of templates) {
    const key = keyOf(t);
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()];
}

/**
 * The template to quote from when a page wants one row per region: the
 * longest interval, so a "from" price stays the monthly one when an hourly
 * template also exists.
 */
export function preferredTemplate(
  templates: Array<VmCustomTemplateParams>,
): VmCustomTemplateParams | undefined {
  return templates.reduce<VmCustomTemplateParams | undefined>(
    (best, t) =>
      best === undefined ||
      intervalLength(templateInterval(t)) >
        intervalLength(templateInterval(best))
        ? t
        : best,
    undefined,
  );
}
