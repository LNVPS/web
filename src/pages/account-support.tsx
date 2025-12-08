import { useState } from "react";
import useLogin from "../hooks/login";
import { hexToBech32 } from "@snort/shared";
import { tryParseNostrLink } from "@snort/system";
import { AsyncButton } from "../components/button";
import { NostrProfile } from "../const";
import { LoginState } from "../login";

export function AccountSupportPage() {
  const login = useLogin();
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [useCustomEncryptKey, setUseCustomEncryptKey] = useState(false);
  const [encryptKey, setEncryptKey] = useState("");

  const [encryptedInput, setEncryptedInput] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [decryptError, setDecryptError] = useState("");
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [decryptKey, setDecryptKey] = useState("");

  const npub = hexToBech32("npub", login?.publicKey);
  const supportNpub = hexToBech32("npub", NostrProfile.id);
  const subjectLine = `[${npub}] Account Query`;

  async function encryptMessage() {
    const key = useCustomEncryptKey
      ? parsePublicKey(encryptKey)
      : NostrProfile.id;
    if (!login || !message.trim() || !key) return;

    const signer = LoginState.getSigner();
    const encrypted = await signer.signer.nip44Encrypt(message, key);
    setEncryptedMessage(encrypted);
  }

  function parsePublicKey(input: string): string | undefined {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const parsed = tryParseNostrLink(trimmed);
    return parsed?.id ?? trimmed;
  }

  async function decryptMessage() {
    const key = useCustomKey ? parsePublicKey(decryptKey) : NostrProfile.id;
    if (!login || !encryptedInput.trim() || !key) return;

    setDecryptError("");
    setDecryptedMessage("");
    try {
      const signer = LoginState.getSigner();
      const decrypted = await signer.signer.nip44Decrypt(encryptedInput, key);
      setDecryptedMessage(decrypted);
    } catch (e) {
      setDecryptError(e instanceof Error ? e.message : String(e));
    }
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

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={useCustomEncryptKey}
            onChange={(e) => setUseCustomEncryptKey(e.target.checked)}
          />
          <label className="text-neutral-400 text-sm">
            Use custom recipient key
          </label>
        </div>

        {useCustomEncryptKey && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-neutral-400 text-sm">
              Recipient's public key (npub/nprofile/hex):
            </label>
            <input
              type="text"
              className="w-full bg-neutral-800 rounded-md p-3 text-sm"
              placeholder="npub1..., nprofile1..., or hex"
              value={encryptKey}
              onChange={(e) => setEncryptKey(e.target.value)}
            />
          </div>
        )}

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

      <div className="border-t border-neutral-700 pt-4">
        <div className="text-lg mb-2">Decrypt Message</div>
        <p className="text-neutral-400 text-sm mb-4">
          Decrypt a message sent to you by support.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={useCustomKey}
            onChange={(e) => setUseCustomKey(e.target.checked)}
          />
          <label className="text-neutral-400 text-sm">
            Use custom sender key
          </label>
        </div>

        {useCustomKey && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-neutral-400 text-sm">
              Sender's public key (npub/nprofile/hex):
            </label>
            <input
              type="text"
              className="w-full bg-neutral-800 rounded-md p-3 text-sm"
              placeholder="npub1..., nprofile1..., or hex"
              value={decryptKey}
              onChange={(e) => setDecryptKey(e.target.value)}
            />
          </div>
        )}

        <textarea
          className="w-full bg-neutral-800 rounded-md p-3 min-h-32 resize-y"
          placeholder="Paste encrypted message here..."
          value={encryptedInput}
          onChange={(e) => setEncryptedInput(e.target.value)}
        />

        <div className="mt-2">
          <AsyncButton
            onClick={decryptMessage}
            disabled={!encryptedInput.trim()}
          >
            Decrypt Message
          </AsyncButton>
        </div>

        {decryptError && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
            {decryptError}
          </div>
        )}

        {decryptedMessage && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-neutral-400 text-sm">Decrypted message:</p>
            <pre className="bg-neutral-900 rounded-md px-3 py-2 text-sm break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
              {decryptedMessage}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
