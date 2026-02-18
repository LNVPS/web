import { Link, useNavigate } from "react-router-dom";
import { VmInstance } from "../api";
import VpsResources from "./vps-resources";
import VmActions from "./vps-actions";

export default function VpsInstanceRow({
  vm,
  actions,
  onReload,
}: {
  vm: VmInstance;
  actions?: boolean;
  onReload?: () => void;
}) {
  const expires = new Date(vm.expires);
  const now = new Date();
  const isExpired = expires <= now;
  const daysLeft = Math.ceil(
    (expires.getTime() - now.getTime()) / 1000 / 60 / 60 / 24,
  );
  const navigate = useNavigate();

  return (
    <div
      className="flex justify-between items-center rounded-sm border border-cyber-border bg-cyber-panel px-3 py-2 cursor-pointer hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200"
      onClick={() =>
        navigate("/vm", {
          state: vm,
        })
      }
    >
      <div className="flex flex-col gap-2">
        <div>
          <span className="text-sm text-cyber-muted">#{vm.id}</span>
          &nbsp;
          <span className="text-cyber-text-bright">
            {vm.ip_assignments?.[0]?.reverse_dns ?? vm.template?.name}
          </span>
          &nbsp;
          <span
            className={`text-xs ${isExpired ? "text-cyber-danger" : daysLeft <= 3 ? "text-cyber-danger" : daysLeft <= 7 ? "text-yellow-400" : "text-cyber-muted"}`}
          >
            {isExpired ? "[Expired]" : `- [${daysLeft} days remaining]`}
          </span>
        </div>
        <VpsResources vm={vm} />
      </div>
      <div className="flex gap-2 items-center">
        {isExpired && (
          <Link
            to="/vm/billing/renew"
            className="text-cyber-danger text-sm"
            state={vm}
            onClick={(e) => e.stopPropagation()}
          >
            Renew
          </Link>
        )}
        {!isExpired && (actions ?? true) && (
          <VmActions vm={vm} onReload={onReload} />
        )}
      </div>
    </div>
  );
}
