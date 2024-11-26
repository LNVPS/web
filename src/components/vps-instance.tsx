import { Link } from "react-router-dom";
import { VmInstance } from "../api";
import OsImageName from "./os-image-name";
import VpsResources from "./vps-resources";
import VmActions from "./vps-actions";

export default function VpsInstanceRow({ vm }: { vm: VmInstance }) {
  const expires = new Date(vm.expires);
  const isExpired = expires <= new Date();

  return (
    <div className="flex justify-between items-center rounded-xl bg-neutral-900 px-3 py-2 cursor-pointer hover:bg-neutral-800">
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
            <Link to="/vm/renew" className="text-red-500 text-sm" state={vm}>
              Expired
            </Link>
          </>
        )}
        {!isExpired && <VmActions vm={vm} />}
      </div>
    </div>
  );
}
