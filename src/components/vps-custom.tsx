import { useEffect, useMemo, useState } from "react";
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
import { FilterButton } from "./button-filter";

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
  return [...disks].sort((a, b) => diskRank(a.disk_type) - diskRank(b.disk_type));
}

function preferredDisk(
  disks: Array<VmCustomTemplateDiskParams>,
): VmCustomTemplateDiskParams | undefined {
  return sortDisks(disks).at(0);
}

const DISK_COPY: Record<DiskType, { title: string; blurb: string }> = {
  [DiskType.SSD]: {
    title: "SSD",
    blurb: "Fast solid-state storage",
  },
  [DiskType.HDD]: {
    title: "HDD",
    blurb: "High-capacity spinning disk",
  },
};

/** One compact resource row: label · slider · editable value. */
function ResourceSlider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
        {label}
      </span>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        min={min}
        max={max}
        step={step}
        className="grow"
      />
      <div className="flex w-28 shrink-0 items-baseline justify-end gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v)) onChange(clamp(v));
          }}
          min={min}
          max={max}
          className="w-14 border-none bg-transparent p-0 text-right text-lg leading-none text-cyber-text-bright tabular-nums focus:outline-none focus:ring-0"
        />
        <span className="w-10 text-[0.65rem] uppercase tracking-wider text-cyber-muted">
          {unit}
        </span>
      </div>
    </div>
  );
}

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

  // Selected template within region (for when there are multiple variants)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(
    templates.at(0)?.id ?? 0,
  );

  // Find current params - either by selected template id or first in region
  const params = useMemo(() => {
    const found = regionTemplates.find((t) => t.id === selectedTemplateId);
    return found ?? regionTemplates[0] ?? templates[0];
  }, [regionTemplates, selectedTemplateId, templates]);

  // Disks with SSD first so it is the default the user sees.
  const sortedDisks = useMemo(() => sortDisks(params.disks), [params.disks]);

  const [cpu, setCpu] = useState(params.min_cpu ?? 1);
  const [diskType, setDiskType] = useState(preferredDisk(params.disks));
  const [ram, setRam] = useState(Math.floor((params.min_memory ?? GiB) / GiB));
  const [disk, setDisk] = useState(
    Math.floor((preferredDisk(params.disks)?.min_disk ?? GiB) / GiB),
  );

  const [price, setPrice] = useState<VmCustomPrice>();

  const cost_plan = {
    id: 0,
    name: "custom",
    amount: price?.amount ?? 0,
    currency: (price?.currency as "BTC" | "EUR" | "USD") ?? "USD",
    other_price: [],
    interval_amount: 1,
    interval_type: CostPlanIntervalType.MONTH,
  };

  // Reset selected template when region changes
  useEffect(() => {
    const firstInRegion = regionTemplates[0];
    if (firstInRegion) {
      setSelectedTemplateId(firstInRegion.id);
    }
  }, [region, regionTemplates]);

  // Reset parameters when selected template changes
  useEffect(() => {
    if (params) {
      const disk0 = preferredDisk(params.disks);
      setCpu(params.min_cpu ?? 1);
      setDiskType(disk0);
      setRam(Math.floor((params.min_memory ?? GiB) / GiB));
      setDisk(Math.floor((disk0?.min_disk ?? GiB) / GiB));
    }
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
    const t = setTimeout(() => {
      const api = new LNVpsApi(ApiUrl ?? "", undefined);
      api
        .customPrice({
          pricing_id: params.id,
          cpu,
          memory: ram * GiB,
          disk: disk * GiB,
          disk_type: diskType?.disk_type ?? DiskType.SSD,
          disk_interface: diskType?.disk_interface ?? DiskInterface.PCIe,
        })
        .then(setPrice);
    }, 500);
    return () => clearTimeout(t);
  }, [region, cpu, ram, disk, diskType, params]);

  if (templates.length == 0) return;

  const diskUnit = `GB ${diskType?.disk_type.toUpperCase() ?? "SSD"}`;

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
                    {template.region.name}
                  </FilterButton>
                ))}
              </div>
            ) : (
              <span className="py-1 text-sm text-cyber-text-bright">
                {regions[0]?.region.name}
              </span>
            )}
          </div>

          {regionTemplates.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                <FormattedMessage defaultMessage="CPU" />
              </span>
              <div className="flex flex-wrap gap-2">
                {regionTemplates.map((template) => (
                  <FilterButton
                    key={template.id}
                    active={selectedTemplateId === template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    {getCpuConstraintLabel(template)}
                  </FilterButton>
                ))}
              </div>
            </div>
          )}
        </div>

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
            label="CPU cores"
            unit="vCPU"
            value={cpu}
            min={params.min_cpu}
            max={params.max_cpu}
            onChange={setCpu}
          />
          <ResourceSlider
            label="Memory"
            unit="GB"
            value={ram}
            min={Math.floor(params.min_memory / GiB)}
            max={Math.floor(params.max_memory / GiB)}
            onChange={setRam}
          />
          <ResourceSlider
            label="Storage"
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
            {cpu} vCPU · {ram} GB · {disk} {diskUnit} @ {params.region.name}
          </div>
          {price && (
            <div className="text-xl leading-none text-cyber-text-bright">
              <CostLabel cost={cost_plan} />
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
              created: new Date().toISOString(),
              region: params.region,
              cost_plan,
            }}
          />
        </div>
      </div>
    </div>
  );
}
