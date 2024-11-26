import { VmInstance, VmTemplate } from "../api";
import BytesSize from "./bytes";

export default function VpsResources({ vm }: { vm: VmInstance | VmTemplate }) {
  const diskType = "template_id" in vm ? vm.template?.disk_type : vm.disk_type;
  const region =
    "region_id" in vm ? vm.region?.name : vm.template?.region?.name;
  const status = "status" in vm ? vm.status : undefined;
  return (
    <>
      <div className="text-xs text-neutral-400">
        {vm.cpu} vCPU, <BytesSize value={vm.memory} /> RAM,{" "}
        <BytesSize value={vm.disk_size} /> {diskType?.toUpperCase()},{" "}
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
