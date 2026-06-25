import Nip17DM from "../components/nip17-dm";
import { FormattedMessage } from "react-intl";

export function AccountMessagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Messages" />
      </div>
      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Your past encrypted NIP-17 messages with support. This inbox is no longer monitored — please use the Support tab to reach us." />
      </p>
      <Nip17DM />
    </div>
  );
}
