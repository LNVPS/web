import { ReactNode, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";
import {
  CostPlanIntervalType,
  CpuArch,
  CpuMfg,
  DiskInterface,
  DiskType,
  LNVpsApi,
  VmCustomPrice,
  VmCustomTemplateDiskParams,
  VmCustomTemplateParams,
} from "../api";
import { ApiUrl, GiB } from "../const";
import CostLabel from "./cost";
import VpsPayButton from "./pay-button";
import { formatPortSpeed } from "../utils/plan-limits";
import { formatDiskInterface } from "../utils/spec-sheet";
import { formatTransferAllowance } from "../utils/bandwidth";
import { FilterButton } from "./button-filter";
import ResourceSlider from "./resource-slider";
import RegionName from "./region-name";
import IntervalTabs from "./interval-tabs";
import { isHourly } from "../utils/hourly";
import {
  cpuVariants,
  distinctIntervals,
  intervalKey,
  templateInterval,
  variantKeyFn,
} from "../utils/custom-intervals";

function formatCpuMfg(mfg?: CpuMfg): string | undefined {
  if (!mfg || mfg === CpuMfg.UNKNOWN) return undefined;
  switch (mfg) {
    case CpuMfg.INTEL:
      return "Intel";
    case CpuMfg.AMD:
      return "AMD";
    case CpuMfg.APPLE:
      return "Apple";
    case CpuMfg.NVIDIA:
      return "NVIDIA";
    case CpuMfg.ARM:
      return "ARM";
    default:
      return undefined;
  }
}

function formatCpuArch(arch?: CpuArch): string | undefined {
  if (!arch || arch === CpuArch.UNKNOWN) return undefined;
  switch (arch) {
    case CpuArch.X86_64:
      return "x86_64";
    case CpuArch.ARM64:
      return "ARM64";
    default:
      return undefined;
  }
}

/**
 * Generate a CPU constraint label for a custom template variant
 */
function getCpuConstraintLabel(template: VmCustomTemplateParams): string {
  const parts: string[] = [];

  // Add CPU manufacturer
  const cpuMfg = formatCpuMfg(template.cpu_mfg);
  if (cpuMfg) {
    parts.push(cpuMfg);
  }

  // Add CPU architecture
  const cpuArch = formatCpuArch(template.cpu_arch);
  if (cpuArch) {
    parts.push(cpuArch);
  }

  // Add notable CPU features (limit to a few key ones)
  if (template.cpu_features && template.cpu_features.length > 0) {
    const notableFeatures = template.cpu_features
      .filter((f) =>
        ["AVX512F", "AVX2", "NestedVirt", "SGX", "SEV", "TDX"].includes(f),
      )
      .slice(0, 2);
    if (notableFeatures.length > 0) {
      parts.push(notableFeatures.join(", "));
    }
  }

  // Return "Any" if no specific constraints
  if (parts.length === 0) {
    return "Any";
  }

  return parts.join(" ");
}

/**
 * Rank disk types so SSD is offered first and selected by default — most
 * customers want fast storage, HDD is the bulk/cheap exception.
 */
function diskRank(type: DiskType): number {
  return type === DiskType.SSD ? 0 : 1;
}

function sortDisks(
  disks: Array<VmCustomTemplateDiskParams>,
): Array<VmCustomTemplateDiskParams> {
  return [...disks].sort(
    (a, b) => diskRank(a.disk_type) - diskRank(b.disk_type),
  );
}

function preferredDisk(
  disks: Array<VmCustomTemplateDiskParams>,
): VmCustomTemplateDiskParams | undefined {
  return sortDisks(disks).at(0);
}

const DISK_COPY: Record<DiskType, { title: string; blurb: ReactNode }> = {
  [DiskType.SSD]: {
    title: "SSD",
    blurb: <FormattedMessage defaultMessage="Fast solid-state storage" />,
  },
  [DiskType.HDD]: {
    title: "HDD",
    blurb: <FormattedMessage defaultMessage="High-capacity spinning disk" />,
  },
};

export function VpsCustomOrder({
  templates,
}: {
  templates: Array<VmCustomTemplateParams>;
}) {
  // Group templates by region
  const templatesByRegion = useMemo(() => {
    const grouped = new Map<number, VmCustomTemplateParams[]>();
    for (const template of templates) {
      const regionId = template.region.id;
      if (!grouped.has(regionId)) {
        grouped.set(regionId, []);
      }
      grouped.get(regionId)!.push(template);
    }
    return grouped;
  }, [templates]);

  // Get unique regions, sorted by id for stable ordering
  const regions = useMemo(() => {
    const seen = new Map<number, VmCustomTemplateParams>();
    for (const template of templates) {
      if (!seen.has(template.region.id)) {
        seen.set(template.region.id, template);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.region.id - b.region.id);
  }, [templates]);

  const [region, setRegion] = useState(regions[0]?.region.id);

  // Get templates for selected region
  const regionTemplates = useMemo(
    () => templatesByRegion.get(region ?? 0) ?? [],
    [templatesByRegion, region],
  );

  // A region is offered as several templates: one per CPU variant, and each
  // of those once per billing interval. The CPU filter picks a variant, the
  // tab strip picks an interval, and together they name exactly one template.
  const variants = useMemo(
    () => cpuVariants(regionTemplates),
    [regionTemplates],
  );
  const variantKey = useMemo(
    () => variantKeyFn(regionTemplates),
    [regionTemplates],
  );
  const [variantSel, setVariantSel] = useState<string>();
  // A selection the new region doesn't offer falls back to its first variant.
  const activeVariant =
    variants.find((v) => variantKey(v) === variantSel) ?? variants[0];
  const activeVariantKey = activeVariant ? variantKey(activeVariant) : "";

  const variantTemplates = useMemo(
    () => regionTemplates.filter((t) => variantKey(t) === activeVariantKey),
    [regionTemplates, variantKey, activeVariantKey],
  );

  const intervals = useMemo(
    () => distinctIntervals(variantTemplates),
    [variantTemplates],
  );
  const [intervalSel, setIntervalSel] = useState<string>();
  // Likewise silent: an interval the new selection lacks falls back to the
  // longest one it has, with the chosen spec left alone.
  const interval =
    intervals.find((i) => intervalKey(i) === intervalSel) ?? intervals[0];

  const params = useMemo(() => {
    const found = variantTemplates.find(
      (t) =>
        interval && intervalKey(templateInterval(t)) === intervalKey(interval),
    );
    return found ?? variantTemplates[0] ?? templates[0];
  }, [variantTemplates, interval, templates]);

  // Disks with SSD first so it is the default the user sees.
  const sortedDisks = useMemo(() => sortDisks(params.disks), [params.disks]);

  const [cpu, setCpu] = useState(params.min_cpu ?? 1);
  const [diskType, setDiskType] = useState(preferredDisk(params.disks));
  const [ram, setRam] = useState(Math.floor((params.min_memory ?? GiB) / GiB));
  const [disk, setDisk] = useState(
    Math.floor((preferredDisk(params.disks)?.min_disk ?? GiB) / GiB),
  );
  const ip4 = params.min_ip4;
  const ip6 = params.min_ip6;
  const transferGb = params.transfer?.default;
  const networkMbps = params.network?.default;

  // Remembered with the template it was quoted for, so switching interval
  // never shows (or lets the buy button use) the previous interval's price.
  const [priced, setPriced] = useState<{ id: number; price: VmCustomPrice }>();
  const price = priced?.id === params.id ? priced.price : undefined;

  const cost_plan = {
    id: 0,
    name: "custom",
    amount: price?.amount ?? 0,
    currency: (price?.currency as "BTC" | "EUR" | "USD") ?? "USD",
    interval_amount: price?.interval_amount ?? interval?.amount ?? 1,
    interval_type:
      price?.interval_type ?? interval?.type ?? CostPlanIntervalType.MONTH,
  };

  // Start from the minimums when the region or CPU variant changes. Keyed on
  // those rather than on `params`, which also changes with the interval tab —
  // switching billing must keep the spec the customer has dialled in.
  useEffect(() => {
    const disk0 = preferredDisk(params.disks);
    setCpu(params.min_cpu ?? 1);
    setDiskType(disk0);
    setRam(Math.floor((params.min_memory ?? GiB) / GiB));
    setDisk(Math.floor((disk0?.min_disk ?? GiB) / GiB));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, activeVariantKey]);

  // A different interval is a different template, whose limits may differ:
  // keep the chosen spec but pull it inside the new template's ranges.
  useEffect(() => {
    setCpu((v) => Math.max(params.min_cpu, Math.min(params.max_cpu, v)));
    setRam((v) =>
      Math.max(
        Math.floor(params.min_memory / GiB),
        Math.min(Math.floor(params.max_memory / GiB), v),
      ),
    );
    setDiskType(
      (prev) =>
        params.disks.find((d) => d.disk_type === prev?.disk_type) ??
        preferredDisk(params.disks),
    );
  }, [params]);

  // Clamp disk value when disk type changes
  useEffect(() => {
    if (diskType) {
      const min = Math.floor(diskType.min_disk / GiB);
      const max = Math.floor(diskType.max_disk / GiB);
      setDisk((prev) => Math.max(min, Math.min(max, prev)));
    }
  }, [diskType]);

  useEffect(() => {
    const pricingId = params.id;
    const t = setTimeout(() => {
      const api = new LNVpsApi(ApiUrl ?? "", undefined);
      api
        .customPrice({
          pricing_id: pricingId,
          cpu,
          memory: ram * GiB,
          disk: disk * GiB,
          disk_type: diskType?.disk_type ?? DiskType.SSD,
          disk_interface: diskType?.disk_interface ?? DiskInterface.PCIe,
          ip4_count: ip4,
          ip6_count: ip6,
          transfer_gb: transferGb,
          network_mbps: networkMbps,
        })
        .then((p) => setPriced({ id: pricingId, price: p }));
    }, 500);
    return () => clearTimeout(t);
  }, [
    region,
    cpu,
    ram,
    disk,
    diskType,
    ip4,
    ip6,
    transferGb,
    networkMbps,
    params,
  ]);

  if (templates.length == 0) return;

  // Media plus bus, since the builder offers both and a buyer picking storage
  // wants to know it is NVMe rather than SATA-attached.
  const diskUnit = [
    `GB ${diskType?.disk_type.toUpperCase() ?? "SSD"}`,
    formatDiskInterface(diskType?.disk_interface),
  ]
    .filter(Boolean)
    .join(" ");
  // Absent on an uncapped plan, in which case the manifest simply omits it
  // rather than claiming a speed the API does not state.
  const portSpeed = formatPortSpeed(networkMbps ?? params.limits?.network_mbps);

  return (
    <div className="overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
      <div className="flex items-baseline gap-2 border-b border-cyber-border bg-cyber-panel-light px-4 py-2.5">
        <span className="text-sm text-cyber-text-bright">
          <FormattedMessage defaultMessage="Build your machine" />
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.25em] text-cyber-muted">
          <FormattedMessage defaultMessage="Custom VPS" />
        </span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Region + CPU constraints */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              <FormattedMessage defaultMessage="Region" />
            </span>
            {regions.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {regions.map((template) => (
                  <FilterButton
                    key={template.region.id}
                    active={region === template.region.id}
                    onClick={() => setRegion(template.region.id)}
                  >
                    <RegionName region={template.region} />
                  </FilterButton>
                ))}
              </div>
            ) : (
              <span className="py-1 text-sm text-cyber-text-bright">
                <RegionName region={regions[0]?.region} />
              </span>
            )}
          </div>

          {variants.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                <FormattedMessage defaultMessage="CPU" />
              </span>
              <div className="flex flex-wrap gap-2">
                {variants.map((template) => (
                  <FilterButton
                    key={variantKey(template)}
                    active={activeVariantKey === variantKey(template)}
                    onClick={() => setVariantSel(variantKey(template))}
                  >
                    {getCpuConstraintLabel(template)}
                  </FilterButton>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Billing interval — only when the selection offers more than one */}
        <IntervalTabs
          intervals={intervals}
          value={interval}
          onChange={(i) => setIntervalSel(intervalKey(i))}
        />

        {/* Storage type — SSD leads, HDD framed as the bulk option */}
        {sortedDisks.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              <FormattedMessage defaultMessage="Storage type" />
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              {sortedDisks.map((d) => {
                const active = diskType?.disk_type === d.disk_type;
                const copy = DISK_COPY[d.disk_type];
                const recommended = d.disk_type === DiskType.SSD;
                return (
                  <button
                    key={d.disk_type}
                    type="button"
                    onClick={() => setDiskType(d)}
                    className={classNames(
                      "flex flex-1 items-center justify-between gap-2 rounded-sm border px-3 py-2 text-left transition-all duration-200",
                      active
                        ? "border-cyber-primary bg-cyber-primary/10 shadow-neon-sm"
                        : "border-cyber-border bg-cyber-panel hover:border-cyber-primary/60",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={classNames(
                          "text-sm font-bold uppercase tracking-wider",
                          active ? "text-cyber-primary" : "text-cyber-text",
                        )}
                      >
                        {copy.title}
                      </span>
                      <span className="text-[0.65rem] text-cyber-muted">
                        {copy.blurb}
                      </span>
                    </div>
                    {recommended && (
                      <span className="shrink-0 rounded-sm border border-cyber-primary/40 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-cyber-primary">
                        <FormattedMessage defaultMessage="Recommended" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="flex flex-col gap-3">
          <ResourceSlider
            label={<FormattedMessage defaultMessage="CPU cores" />}
            unit="vCPU"
            value={cpu}
            min={params.min_cpu}
            max={params.max_cpu}
            onChange={setCpu}
          />
          <ResourceSlider
            label={<FormattedMessage defaultMessage="Memory" />}
            unit="GB"
            value={ram}
            min={Math.floor(params.min_memory / GiB)}
            max={Math.floor(params.max_memory / GiB)}
            onChange={setRam}
          />
          <ResourceSlider
            label={<FormattedMessage defaultMessage="Storage" />}
            unit="GB"
            value={disk}
            min={Math.floor((diskType?.min_disk ?? 0) / GiB)}
            max={Math.floor((diskType?.max_disk ?? 0) / GiB)}
            onChange={setDisk}
          />
        </div>
      </div>

      {/* Summary footer: live build manifest + price + buy */}
      <div className="flex flex-col gap-3 border-t border-cyber-border bg-cyber-panel-light px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="font-mono text-xs text-cyber-muted tabular-nums">
            {cpu} vCPU · {ram} GB · {disk} {diskUnit} · {ip4} IPv4
            {ip6 > 0 && ` + ${ip6} IPv6`}
            {portSpeed && ` · ${portSpeed} port`}
            {transferGb !== undefined &&
              ` · ${formatTransferAllowance(transferGb)}/mo`}{" "}
            @ <RegionName region={params.region} className="gap-1" />
          </div>
          {price && (
            <div className="text-xl leading-none text-cyber-text-bright">
              <CostLabel
                cost={cost_plan}
                companyId={params.region.company_id}
              />
            </div>
          )}
          {isHourly(interval?.type) && (
            <div className="text-[0.65rem] text-cyber-muted">
              <FormattedMessage defaultMessage="Paid from your account credit, billed every hour." />
            </div>
          )}
        </div>
        <div className="sm:w-48">
          <VpsPayButton
            spec={{
              id: 0,
              pricing_id: params.id,
              cpu,
              name: "Custom",
              memory: ram * GiB,
              disk_size: disk * GiB,
              disk_type: diskType?.disk_type ?? DiskType.SSD,
              disk_interface: diskType?.disk_interface ?? DiskInterface.PCIe,
              ip4_count: ip4,
              ip6_count: ip6,
              created: new Date().toISOString(),
              region: params.region,
              cost_plan,
              // Copied onto the VM at order time, so the confirmation page
              // states the same caps the built machine will run under.
              transfer_gb: transferGb ?? params.transfer_gb,
              limits: {
                ...params.limits,
                network_mbps: networkMbps ?? params.limits?.network_mbps,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
