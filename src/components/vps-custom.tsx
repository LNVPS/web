import { useEffect, useState } from "react";
import {
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

export function VpsCustomOrder({
  templates,
}: {
  templates: Array<VmCustomTemplateParams>;
}) {
  const [region, setRegion] = useState(templates.at(0)?.region.id);
  const params = templates.find((t) => t.region.id == region) ?? templates[0];
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
    currency: price?.currency ?? "",
    interval_amount: 1,
    interval_type: "month",
  };

  // Reset parameters when region changes
  useEffect(() => {
    if (params) {
      setCpu(params.min_cpu ?? 1);
      setDiskType(params.disks.at(0));
      setRam(Math.floor((params.min_memory ?? GiB) / GiB));
      setDisk(Math.floor((params.disks.at(0)?.min_disk ?? GiB) / GiB));
    }
  }, [region, params]);

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
      <div className="text-lg">Custom VPS Order</div>
      {templates.length > 1 && (
        <div className="flex gap-2 items-center">
          <div className="text-sm text-cyber-muted py-2">Region:</div>
          {templates.map((template) => (
            <FilterButton
              key={template.region.id}
              active={region === template.region.id}
              onClick={() => setRegion(template.region.id)}
            >
              {template.region.name}
            </FilterButton>
          ))}
        </div>
      )}
      {params.disks.length > 1 && (
        <div className="flex gap-2">
          <div className="text-sm text-cyber-muted py-2">Disk:</div>
          {params.disks.map((d) => (
            <FilterButton
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
                created: new Date(),
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
