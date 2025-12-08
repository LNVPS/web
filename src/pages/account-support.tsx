import { useState } from "react";
import useLogin from "../hooks/login";
import { hexToBech32 } from "@snort/shared";
import { AsyncButton } from "../components/button";
import { NostrProfile } from "../const";
import { LoginState } from "../login";

export function AccountSupportPage() {
  const login = useLogin();
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const npub = hexToBech32("npub", login?.publicKey);
  const supportNpub = hexToBech32("npub", NostrProfile.id);
  const subjectLine = `[${npub}] Account Query`;

  async function encryptMessage() {
    if (!login || !message.trim()) return;

    const signer = LoginState.getSigner();
    const encrypted = await signer.signer.nip44Encrypt(message, NostrProfile.id);
    setEncryptedMessage(encrypted);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(encryptedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Support</div>

      <div className="flex flex-col gap-2">
        <p className="text-neutral-400 text-sm">
          Your Public Key (include this in all communications):
        </p>
        <pre className="bg-neutral-900 rounded-md px-3 py-2 select-all text-sm break-all">
          {npub}
        </pre>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-neutral-400 text-sm">Contact us via email:</p>
        <a
          href={`mailto:sales@lnvps.net?subject=${encodeURIComponent(subjectLine)}`}
          className="text-blue-400 underline"
        >
          sales@lnvps.net
        </a>
      </div>

      <div className="border-t border-neutral-700 pt-4">
        <div className="text-lg mb-2">Encrypted Message</div>
        <p className="text-neutral-400 text-sm mb-4">
          Use NIP-44 encryption to send a secure message. This proves you own
          the private key associated with your account. Encrypt your message
          below and include the encrypted text in your email.
        </p>
        <p className="text-neutral-500 text-xs mb-4">
          Support pubkey: {supportNpub}
        </p>

        <textarea
          className="w-full bg-neutral-800 rounded-md p-3 min-h-32 resize-y"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="mt-2">
          <AsyncButton onClick={encryptMessage} disabled={!message.trim()}>
            Encrypt Message
          </AsyncButton>
        </div>

        {encryptedMessage && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-neutral-400 text-sm">
              Encrypted message (copy and include in your email):
            </p>
            <pre className="bg-neutral-900 rounded-md px-3 py-2 text-sm break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
              {encryptedMessage}
            </pre>
            <AsyncButton onClick={copyToClipboard}>
              {copied ? "Copied!" : "Copy to Clipboard"}
            </AsyncButton>
          </div>
        )}
      </div>
    </div>
  );
}
