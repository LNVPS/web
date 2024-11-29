import { EventPublisher } from "@snort/system";
import { LNVpsApi, VmInstance } from "../api";
import { ApiUrl } from "../const";
import useLogin from "../hooks/login";
import { Icon } from "./icon";
import { AsyncButton } from "./button";

export default function VmActions({
  vm,
  onReload,
}: {
  vm: VmInstance;
  onReload?: () => void;
}) {
  const login = useLogin();
  const state = vm.status?.state;
  if (!state) return;

  const api = new LNVpsApi(
    ApiUrl,
    login?.signer ? new EventPublisher(login.signer, login.pubkey) : undefined,
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <AsyncButton
          onClick={async (e) => {
            e.stopPropagation();

            if (state === "running") {
              await api.stopVm(vm.id);
            } else {
              await api.startVm(vm.id);
            }
            onReload?.();
          }}
          className="bg-neutral-700 hover:bg-neutral-600"
        >
          <Icon name={state === "running" ? "stop" : "start"} size={30} />
        </AsyncButton>

        {/*<Icon
          name="delete"
          className="bg-neutral-700 p-2 rounded-lg hover:bg-neutral-600"
          size={40}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
        <Icon
          name="refresh-1"
          className="bg-neutral-700 p-2 rounded-lg hover:bg-neutral-600"
          size={40}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />*/}
      </div>
    </div>
  );
}
