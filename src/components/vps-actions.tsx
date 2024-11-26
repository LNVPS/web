import { VmInstance } from "../api";
import { Icon } from "./icon";

export default function VmActions({ vm }: { vm: VmInstance }) {
  const state = vm.status?.state;
  if (!state) return;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Icon
          name={state === "running" ? "stop" : "start"}
          className="bg-neutral-700 p-2 rounded-lg hover:bg-neutral-600"
          size={40}
        />
        <Icon
          name="delete"
          className="bg-neutral-700 p-2 rounded-lg hover:bg-neutral-600"
          size={40}
        />
        <Icon
          name="refresh-1"
          className="bg-neutral-700 p-2 rounded-lg hover:bg-neutral-600"
          size={40}
        />
      </div>
    </div>
  );
}
