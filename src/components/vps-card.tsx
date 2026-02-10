import { VmTemplate } from "../api";
import BytesSize from "./bytes";
import CostLabel from "./cost";
import VpsPayButton from "./pay-button";

export default function VpsCard({ spec }: { spec: VmTemplate }) {
  return (
    <div className="rounded border border-cyber-border px-3 py-2 flex flex-col gap-2 bg-cyber-panel hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-300">
      <div className="text-lg text-cyber-primary">{spec.name}</div>
      <ul className="text-cyber-text text-sm">
        <li>CPU: {spec.cpu}vCPU</li>
        <li>
          RAM: <BytesSize value={spec.memory} />
        </li>
        <li>
          {spec.disk_type.toUpperCase()}: <BytesSize value={spec.disk_size} />
        </li>
        <li>Location: {spec.region?.name}</li>
      </ul>
      <div className="text-lg text-cyber-accent">
        {spec.cost_plan && <CostLabel cost={spec.cost_plan} />}
      </div>
      <VpsPayButton spec={spec} />
    </div>
  );
}
