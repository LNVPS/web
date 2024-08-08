import { DiskType, MachineSpec } from "../api";
import CostLabel from "./cost";
import VpsPayButton from "./pay-button";

export default function VpsCard({ spec }: { spec: MachineSpec }) {
    return <div className="rounded-xl border border-netrual-500 px-2 py-3">
        <h2>{spec.id}</h2>
        <ul>
            <li>CPU: {spec.cpu}vCPU</li>
            <li>RAM: {spec.ram / 1024 / 1024 / 1024}GB</li>
            <li>{spec.disk.type === DiskType.SSD ? "SSD" : "HDD"}: {spec.disk.size / 1024 / 1024 / 1024}GB</li>
        </ul>
        <h2><CostLabel cost={spec.cost} /></h2>
        <VpsPayButton spec={spec} />
    </div>
}