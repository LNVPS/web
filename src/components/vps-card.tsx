import { CpuArch, CpuMfg, VmTemplate } from "../api";
import BytesSize from "./bytes";
import CostLabel from "./cost";
import { useNavigateOrder } from "../hooks/order";
import { AsyncButton } from "./button";
import { FormattedMessage } from "react-intl";

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

export function VpsTableHeader() {
  return (
    <thead>
      <tr>
        <th>
          <FormattedMessage defaultMessage="Name" />
        </th>
        <th>
          <FormattedMessage defaultMessage="CPU" />
        </th>
        <th>
          <FormattedMessage defaultMessage="RAM" />
        </th>
        <th>
          <FormattedMessage defaultMessage="Disk" />
        </th>
        <th>
          <FormattedMessage defaultMessage="Location" />
        </th>
        <th>
          <FormattedMessage defaultMessage="Price" />
        </th>
        <th></th>
      </tr>
    </thead>
  );
}

export default function VpsRow({ spec }: { spec: VmTemplate }) {
  const order = useNavigateOrder();
  const cpuMfg = formatCpuMfg(spec.cpu_mfg);
  const cpuArch = formatCpuArch(spec.cpu_arch);
  const cpuInfo = [cpuMfg, cpuArch].filter(Boolean).join(" ");

  return (
    <tr className="hover:bg-cyber-panel-light/50 transition-colors">
      <td className="text-cyber-primary font-medium">{spec.name}</td>
      <td>
        <FormattedMessage
          defaultMessage="{cpu} vCPU"
          values={{ cpu: spec.cpu }}
        />
        {cpuInfo && (
          <span className="text-cyber-muted text-xs ml-1">({cpuInfo})</span>
        )}
      </td>
      <td>
        <BytesSize value={spec.memory} />
      </td>
      <td>
        <BytesSize value={spec.disk_size} />{" "}
        <span className="text-cyber-muted">{spec.disk_type.toUpperCase()}</span>
      </td>
      <td>{spec.region?.name}</td>
      <td className="text-cyber-accent">
        {spec.cost_plan && <CostLabel cost={spec.cost_plan} />}
      </td>
      <td>
        <AsyncButton
          className="text-sm uppercase rounded-sm px-4 py-1.5 font-bold cursor-pointer select-none bg-cyber-primary/20 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon whitespace-nowrap"
          onClick={() =>
            order({
              type: "vm",
              template: spec,
            })
          }
        >
          <FormattedMessage defaultMessage="Buy Now" />
        </AsyncButton>
      </td>
    </tr>
  );
}
