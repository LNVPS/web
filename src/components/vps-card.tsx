import { DiskType, MachineSpec } from "../api";
import BytesSize from "./bytes";
import CostLabel from "./cost";
import VpsPayButton from "./pay-button";

export default function VpsCard({ spec }: { spec: MachineSpec }) {
  return (
    <div className="rounded-xl border border-neutral-600 px-3 py-2">
      <h2>{spec.id}</h2>
      <ul>
        <li>CPU: {spec.cpu}vCPU</li>
        <li>
          RAM: <BytesSize value={spec.ram} />
        </li>
        <li>
          {spec.disk.type === DiskType.SSD ? "SSD" : "HDD"}:{" "}
          <BytesSize value={spec.disk.size} />
        </li>
        <li>
          Location: {spec.location}
        </li>
      </ul>
      <h2>
        <CostLabel cost={spec.cost} />
      </h2>
      <VpsPayButton spec={spec} />
    </div>
  );
}
