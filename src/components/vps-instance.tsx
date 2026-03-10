import { Link, useNavigate } from "react-router-dom";
import { VmInstance } from "../api";
import VpsResources from "./vps-resources";
import VmActions from "./vps-actions";
import { FormattedMessage } from "react-intl";

export default function VpsInstanceRow({
  vm,
  actions,
  onReload,
}: {
  vm: VmInstance;
  actions?: boolean;
  onReload?: () => void;
}) {
  const isNew = !vm.expires;
  const expires = vm.expires ? new Date(vm.expires) : undefined;
  const now = new Date();
  const isExpired = expires ? expires <= now : false;
  const daysLeft = expires
    ? Math.ceil((expires.getTime() - now.getTime()) / 1000 / 60 / 60 / 24)
    : undefined;
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
            className={`text-xs ${isNew ? "text-cyber-primary" : isExpired ? "text-cyber-danger" : daysLeft !== undefined && daysLeft <= 3 ? "text-cyber-danger" : daysLeft !== undefined && daysLeft <= 7 ? "text-yellow-400" : "text-cyber-muted"}`}
          >
            {isNew ? (
              <FormattedMessage defaultMessage="[New]" />
            ) : isExpired ? (
              <FormattedMessage defaultMessage="[Expired]" />
            ) : (
              <FormattedMessage
                defaultMessage="- [{daysLeft} days remaining]"
                values={{ daysLeft }}
              />
            )}
          </span>
        </div>
        <VpsResources vm={vm} />
      </div>
      <div className="flex gap-2 items-center">
        {isNew && (
          <Link
            to="/vm/billing/renew"
            className="text-cyber-primary text-sm"
            state={vm}
            onClick={(e) => e.stopPropagation()}
          >
            <FormattedMessage defaultMessage="Pay Now" />
          </Link>
        )}
        {isExpired && (
          <Link
            to="/vm/billing/renew"
            className="text-cyber-danger text-sm"
            state={vm}
            onClick={(e) => e.stopPropagation()}
          >
            <FormattedMessage defaultMessage="Renew" />
          </Link>
        )}
        {!isNew && !isExpired && (actions ?? true) && (
          <VmActions vm={vm} onReload={onReload} />
        )}
      </div>
    </div>
  );
}
