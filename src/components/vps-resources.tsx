import { CpuArch, CpuMfg, VmInstance, VmTemplate } from "../api";
import BytesSize from "./bytes";
import { FormattedMessage, useIntl } from "react-intl";

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

export default function VpsResources({ vm }: { vm: VmInstance | VmTemplate }) {
  const { formatNumber } = useIntl();
  const diskType = "template" in vm ? vm.template?.disk_type : vm.disk_type;
  const region = "region" in vm ? vm.region.name : vm.template?.region?.name;
  const status = "status" in vm ? vm.status : undefined;
  const template = "template" in vm ? vm.template : (vm as VmTemplate);
  const cpuMfg = formatCpuMfg(template?.cpu_mfg);
  const cpuArch = formatCpuArch(template?.cpu_arch);
  const cpuInfo = [cpuMfg, cpuArch].filter(Boolean).join(" ");
  return (
    <>
      <div className="text-xs text-cyber-muted">
        {template?.cpu} vCPU{cpuInfo && ` (${cpuInfo})`},{" "}
        <BytesSize value={template?.memory ?? 0} /> RAM,{" "}
        <BytesSize value={template?.disk_size ?? 0} /> {diskType?.toUpperCase()}
        {region && (
          <>
            ,{" "}
            <FormattedMessage
              defaultMessage="Location: {region}"
              values={{ region }}
            />
          </>
        )}
      </div>
      {status && status.state === "running" && (
        <div className="text-sm text-cyber-text">
          <div className="w-2 h-2 rounded-full bg-cyber-primary inline-block shadow-neon-sm"></div>{" "}
          {status.cpu_usage !== undefined
            ? `${formatNumber(status.cpu_usage, { style: "percent", maximumFractionDigits: 1 })} CPU`
            : "CPU"}{" "}
          {status.mem_usage !== undefined
            ? `${formatNumber(status.mem_usage, { style: "percent", maximumFractionDigits: 0 })} RAM`
            : "RAM"}
        </div>
      )}
      {status && status.state === "stopped" && (
        <div className="text-sm text-cyber-text">
          <div className="w-2 h-2 rounded-full bg-cyber-danger inline-block shadow-neon-danger"></div>{" "}
          <FormattedMessage defaultMessage="Stopped" />
        </div>
      )}
      {status && status.state === "creating" && (
        <div className="text-sm text-cyber-text">
          <div className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></div>{" "}
          <FormattedMessage defaultMessage="Creating" />
        </div>
      )}
    </>
  );
}
