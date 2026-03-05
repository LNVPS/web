import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  CostPlanIntervalType,
  CpuArch,
  CpuMfg,
  DiskInterface,
  DiskType,
  LNVpsApi,
  VmCustomPrice,
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

  // Get unique regions
  const regions = useMemo(() => {
    const seen = new Map<number, VmCustomTemplateParams>();
    for (const template of templates) {
      if (!seen.has(template.region.id)) {
        seen.set(template.region.id, template);
      }
    }
    return Array.from(seen.values());
  }, [templates]);

  const [region, setRegion] = useState(templates.at(0)?.region.id);

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

  const [cpu, setCpu] = useState(params.min_cpu ?? 1);
  const [diskType, setDiskType] = useState(params.disks.at(0));
  const [ram, setRam] = useState(Math.floor((params.min_memory ?? GiB) / GiB));
  const [disk, setDisk] = useState(
    Math.floor((diskType?.min_disk ?? GiB) / GiB),
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
      setCpu(params.min_cpu ?? 1);
      setDiskType(params.disks.at(0));
      setRam(Math.floor((params.min_memory ?? GiB) / GiB));
      setDisk(Math.floor((params.disks.at(0)?.min_disk ?? GiB) / GiB));
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
      const api = new LNVpsApi(ApiUrl, undefined);
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

  return (
    <div className="flex flex-col gap-4 bg-cyber-panel rounded-sm px-4 py-6">
      <div className="text-lg">
        <FormattedMessage defaultMessage="Custom VPS Order" />
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <div className="text-sm text-cyber-muted py-2">
          <FormattedMessage defaultMessage="Region:" />
        </div>
        {regions.length > 1 ? (
          regions.map((template) => (
            <FilterButton
              key={template.region.id}
              active={region === template.region.id}
              onClick={() => setRegion(template.region.id)}
            >
              {template.region.name}
            </FilterButton>
          ))
        ) : (
          <span className="text-sm">{regions[0]?.region.name}</span>
        )}
      </div>
      {regionTemplates.length > 1 && (
        <div className="flex gap-2 items-center flex-wrap">
          <div className="text-sm text-cyber-muted py-2">
            <FormattedMessage defaultMessage="CPU:" />
          </div>
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
      )}
      {params.disks.length > 1 && (
        <div className="flex gap-2">
          <div className="text-sm text-cyber-muted py-2">
            <FormattedMessage defaultMessage="Disk:" />
          </div>
          {params.disks.map((d) => (
            <FilterButton
              key={d.disk_type}
              active={diskType?.disk_type === d.disk_type}
              onClick={() => setDiskType(d)}
            >
              {d.disk_type.toUpperCase()}
            </FilterButton>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="min-w-[140px] flex items-center gap-2">
          <input
            type="number"
            value={cpu}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v))
                setCpu(Math.max(params.min_cpu, Math.min(params.max_cpu, v)));
            }}
            min={params.min_cpu}
            max={params.max_cpu}
            className="w-20 text-center"
          />
          <span className="text-cyber-muted text-sm">CPU</span>
        </div>
        <input
          type="range"
          value={cpu}
          onChange={(e) => setCpu(e.target.valueAsNumber)}
          min={params.min_cpu}
          max={params.max_cpu}
          step={1}
          className="grow"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="min-w-[140px] flex items-center gap-2">
          <input
            type="number"
            value={ram}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              const min = Math.floor(params.min_memory / GiB);
              const max = Math.floor(params.max_memory / GiB);
              if (!isNaN(v)) setRam(Math.max(min, Math.min(max, v)));
            }}
            min={Math.floor(params.min_memory / GiB)}
            max={Math.floor(params.max_memory / GiB)}
            className="w-20 text-center"
          />
          <span className="text-cyber-muted text-sm">GB RAM</span>
        </div>
        <input
          type="range"
          value={ram}
          onChange={(e) => setRam(e.target.valueAsNumber)}
          min={Math.floor(params.min_memory / GiB)}
          max={Math.floor(params.max_memory / GiB)}
          step={1}
          className="grow"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="min-w-[160px] flex items-center gap-2">
          <input
            type="number"
            value={disk}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              const min = Math.floor((diskType?.min_disk ?? 0) / GiB);
              const max = Math.floor((diskType?.max_disk ?? 0) / GiB);
              if (!isNaN(v)) setDisk(Math.max(min, Math.min(max, v)));
            }}
            min={Math.floor((diskType?.min_disk ?? 0) / GiB)}
            max={Math.floor((diskType?.max_disk ?? 0) / GiB)}
            className="w-24 text-center"
          />
          <span className="text-cyber-muted text-sm">
            GB {diskType?.disk_type.toLocaleUpperCase()}
          </span>
        </div>
        <input
          type="range"
          value={disk}
          onChange={(e) => setDisk(e.target.valueAsNumber)}
          min={Math.floor((diskType?.min_disk ?? 0) / GiB)}
          max={Math.floor((diskType?.max_disk ?? 0) / GiB)}
          step={1}
          className="grow"
        />
      </div>
      {price && (
        <div className="flex items-center justify-between">
          <div className="text-xl flex-1">
            <CostLabel cost={cost_plan} />
          </div>
          <div className="flex-1">
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
      )}
    </div>
  );
}
