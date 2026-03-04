import Nip17DM from "../components/nip17-dm";
import { FormattedMessage } from "react-intl";

export function AccountMessagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Messages" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Send and receive encrypted direct messages with support via NIP-17. Messages are end-to-end encrypted." />
      </p>
      <Nip17DM />
    </div>
  );
}
