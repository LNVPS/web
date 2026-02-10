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
      className="bg-cyber-panel rounded border border-cyber-border px-2 py-3 flex items-center justify-between"
      key={domain.id}
    >
      <div className="flex flex-col gap-2">
        <div className="text-cyber-text-bright">{domain.name}</div>
        <div className="flex gap-2 items-center text-cyber-muted text-sm">
          <div>{domain.handles} handles</div>
          {!domain.enabled && <div className="text-cyber-danger">Inactive</div>}
        </div>
      </div>
      {canEdit && (
        <AsyncButton
          className="bg-cyber-panel-light border-cyber-border hover:border-cyber-primary"
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
