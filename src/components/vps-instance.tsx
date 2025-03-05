import { Link, useNavigate } from "react-router-dom";
import { VmInstance } from "../api";
import OsImageName from "./os-image-name";
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
  const isExpired = expires <= new Date();
  const navigate = useNavigate();

  return (
    <div
      className="flex justify-between items-center rounded-xl bg-neutral-900 px-3 py-2 cursor-pointer hover:bg-neutral-800"
      onClick={() =>
        navigate("/vm", {
          state: vm,
        })
      }
    >
      <div className="flex flex-col gap-2">
        <div>
          <span className="text-sm text-neutral-400">#{vm.id}</span>
          &nbsp;
          {vm.template?.name}
          &nbsp;
          <span className="text-sm text-neutral-400">
            <OsImageName image={vm.image!} />
          </span>
        </div>
        <VpsResources vm={vm} />
      </div>
      <div className="flex gap-2 items-center">
        {isExpired && (
          <>
            <Link
              to="/vm/billing/renew"
              className="text-red-500 text-sm"
              state={vm}
              onClick={(e) => e.stopPropagation()}
            >
              Expired
            </Link>
          </>
        )}
        {!isExpired && (actions ?? true) && (
          <VmActions vm={vm} onReload={onReload} />
        )}
      </div>
    </div>
  );
}
