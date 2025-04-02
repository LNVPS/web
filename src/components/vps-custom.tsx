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
  const [region] = useState(templates.at(0)?.region.id);
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
    <div className="flex flex-col gap-4 bg-neutral-900 rounded-xl px-4 py-6">
      <div className="text-lg">Custom VPS Order</div>
      {params.disks.length > 1 && (
        <div className="flex gap-2">
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
        <div className="min-w-[100px]">{cpu} CPU</div>
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
        <div className="min-w-[100px]">{ram.toString()} GB RAM</div>
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
        <div className="min-w-[100px]">
          {disk.toString()} GB {diskType?.disk_type.toLocaleUpperCase()}
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
