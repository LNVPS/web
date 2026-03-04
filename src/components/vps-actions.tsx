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

        <AsyncButton
          title={formatMessage({ defaultMessage: "Reinstall" })}
          onClick={async (e) => {
            e.stopPropagation();
            if (
              confirm(
                formatMessage({
                  defaultMessage:
                    "Are you sure you want to re-install your VM?\nTHIS WILL DELETE ALL DATA!!",
                }),
              )
            ) {
              await login?.api.reinstallVm(vm.id);
              onReload?.();
            }
          }}
          className="bg-cyber-panel-light border-cyber-border hover:border-cyber-danger hover:shadow-neon-danger"
        >
          <Icon name="refresh-1" size={30} />
        </AsyncButton>
      </div>
    </div>
  );
}
