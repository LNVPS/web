import { VmTemplate } from "../api";
import BytesSize from "./bytes";
import CostLabel from "./cost";
import { useNavigateOrder } from "../hooks/order";
import { AsyncButton } from "./button";

export function VpsTableHeader() {
  return (
    <thead>
      <tr>
        <th>Name</th>
        <th>CPU</th>
        <th>RAM</th>
        <th>Disk</th>
        <th>Location</th>
        <th>Price</th>
        <th></th>
      </tr>
    </thead>
  );
}

export default function VpsRow({ spec }: { spec: VmTemplate }) {
  const order = useNavigateOrder();

  return (
    <tr className="hover:bg-cyber-panel-light/50 transition-colors">
      <td className="text-cyber-primary font-medium">{spec.name}</td>
      <td>{spec.cpu} vCPU</td>
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
          Buy Now
        </AsyncButton>
      </td>
    </tr>
  );
}
