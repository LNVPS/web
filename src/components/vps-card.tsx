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

// Card presentation for when only a handful of standard plans exist — a full
// table reads as empty scaffolding with 1–2 rows. Visually rhymes with the
// custom builder card so the page reads "pick a plan, or build your own".
export function VpsPlanCard({ spec }: { spec: VmTemplate }) {
  const order = useNavigateOrder();
  const cpuMfg = formatCpuMfg(spec.cpu_mfg);
  const cpuArch = formatCpuArch(spec.cpu_arch);
  const cpuInfo = [cpuMfg, cpuArch].filter(Boolean).join(" ");

  return (
    <div className="overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
      <div className="flex items-baseline justify-between gap-2 border-b border-cyber-border bg-cyber-panel-light px-4 py-2.5">
        <span className="text-sm text-cyber-text-bright">{spec.name}</span>
        <span className="text-[0.6rem] uppercase tracking-[0.25em] text-cyber-muted">
          {spec.region?.name}
        </span>
      </div>
      <div className="px-4 py-3 font-mono text-xs text-cyber-text tabular-nums">
        {spec.cpu} vCPU{cpuInfo && ` (${cpuInfo})`} · <BytesSize value={spec.memory} />{" "}
        RAM · <BytesSize value={spec.disk_size} /> {spec.disk_type.toUpperCase()}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-cyber-border bg-cyber-panel-light px-4 py-3">
        <div className="text-xl leading-none text-cyber-text-bright">
          {spec.cost_plan && <CostLabel cost={spec.cost_plan} />}
        </div>
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
      </div>
    </div>
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
        {spec.cpu} vCPU
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
