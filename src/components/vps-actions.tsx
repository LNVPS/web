import { VmInstance } from "../api";
import useLogin from "../hooks/login";
import { Icon } from "./icon";
import { AsyncButton } from "./button";
import { useIntl } from "react-intl";

export default function VmActions({
  vm,
  onReload,
}: {
  vm: VmInstance;
  onReload?: () => void;
}) {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const state = vm.status?.state;
  if (!login?.api) return;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <AsyncButton
          title={
            state === "running"
              ? formatMessage({ defaultMessage: "Stop VM" })
              : formatMessage({ defaultMessage: "Start VM" })
          }
          onClick={async (e) => {
            e.stopPropagation();
            if (state === "running") {
              await login?.api.stopVm(vm.id);
            } else {
              await login?.api.startVm(vm.id);
            }
            onReload?.();
          }}
          className="bg-cyber-panel-light border-cyber-border hover:border-cyber-primary"
        >
          <Icon name={state === "running" ? "stop" : "start"} size={30} />
        </AsyncButton>
      </div>
    </div>
  );
}
