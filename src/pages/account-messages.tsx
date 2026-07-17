import Nip17DM from "../components/nip17-dm";
import useLogin from "../hooks/login";
import { FormattedMessage } from "react-intl";

export function AccountMessagesPage() {
  const login = useLogin();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Messages" />
      </div>
      {login?.isNostrless ? (
        <div className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Encrypted messaging is only available for Nostr accounts. Your account has no Nostr key to read or send NIP-17 messages. For help, please use the Support tab." />
        </div>
      ) : (
        <>
          <p className="text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="Your past encrypted NIP-17 messages with support. This inbox is no longer monitored — please use the Support tab to reach us." />
          </p>
          <Nip17DM />
        </>
      )}
    </div>
  );
}
