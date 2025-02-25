import { VmInstance, VmTemplate } from "../api";
import BytesSize from "./bytes";

export default function VpsResources({ vm }: { vm: VmInstance | VmTemplate }) {
  const diskType = "template" in vm ? vm.template?.disk_type : vm.disk_type;
  const region =
    "region" in vm ? vm.region.name : vm.template?.region?.name;
  const status = "status" in vm ? vm.status : undefined;
  const template = "template" in vm ? vm.template : vm as VmTemplate;
  return (
    <>
      <div className="text-xs text-neutral-400">
        {template?.cpu} vCPU, <BytesSize value={template?.memory ?? 0} /> RAM,{" "}
        <BytesSize value={template?.disk_size ?? 0} /> {diskType?.toUpperCase()},{" "}
        {region && <>Location: {region}</>}
      </div>
      {status && status.state === "running" && (
        <div className="text-sm text-neutral-200">
          <div className="w-2 h-2 rounded-full bg-green-800 inline-block"></div>{" "}
          {(100 * status.cpu_usage).toFixed(1)}% CPU,{" "}
          {(100 * status.mem_usage).toFixed(0)}% RAM
        </div>
      )}
      {status && status.state === "stopped" && (
        <div className="text-sm text-neutral-200">
          <div className="w-2 h-2 rounded-full bg-red-800 inline-block"></div>{" "}
          Stopped
        </div>
      )}
    </>
  );
}
