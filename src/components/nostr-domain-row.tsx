import { useNavigate } from "react-router-dom";
import { NostrDomain } from "../api";
import { AsyncButton } from "./button";
import { Icon } from "./icon";

export function NostrDomainRow({
  domain,
  canEdit,
}: {
  domain: NostrDomain;
  canEdit?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-neutral-900 rounded-xl px-2 py-3 flex items-center justify-between"
      key={domain.id}
    >
      <div className="flex flex-col gap-2">
        <div>{domain.name}</div>
        <div className="flex gap-2 items-center text-neutral-400 text-sm">
          <div>{domain.handles} handles</div>
          {!domain.enabled && <div className="text-red-500">Inactive</div>}
        </div>
      </div>
      {canEdit && (
        <AsyncButton
          className="bg-neutral-700 hover:bg-neutral-600"
          onClick={() =>
            navigate("/account/nostr-domain", {
              state: domain,
            })
          }
        >
          <Icon name={"pencil"} size={30} />
        </AsyncButton>
      )}
    </div>
  );
}
