import Nip17DM from "../components/nip17-dm";

export function AccountMessagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Messages</div>
      <p className="text-cyber-muted text-sm">
        Send and receive encrypted direct messages with support via NIP-17.
        Messages are end-to-end encrypted.
      </p>
      <Nip17DM />
    </div>
  );
}
