import { NostrDomain } from "../api";
import { NostrDomainRow } from "./nostr-domain-row";

interface DomainListProps {
  domains: NostrDomain[];
}

export function DomainList({ domains }: DomainListProps) {
  if (domains.length === 0) {
    return (
      <div className="text-neutral-500 text-sm p-4 text-center border-2 border-dashed border-neutral-700 rounded-xl">
        No domains added yet. Add your first domain above to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {domains.map((domain) => (
        <NostrDomainRow key={domain.id} domain={domain} canEdit={true} />
      ))}
    </div>
  );
}
