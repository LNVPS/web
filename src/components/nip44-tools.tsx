import { useState } from "react";
import { hexToBech32 } from "@snort/shared";
import { tryParseNostrLink } from "@snort/system";
import { AsyncButton } from "./button";
import { CopyButton } from "./copy-button";
import { NostrProfile } from "../const";
import { LoginState } from "../login";
import { FormattedMessage, useIntl } from "react-intl";

export default function Nip44Tools() {
  const { formatMessage } = useIntl();
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [useCustomEncryptKey, setUseCustomEncryptKey] = useState(false);
  const [encryptKey, setEncryptKey] = useState("");

  const [encryptedInput, setEncryptedInput] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [decryptError, setDecryptError] = useState("");
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [decryptKey, setDecryptKey] = useState("");

  const supportNpub = hexToBech32("npub", NostrProfile.id);

  function parsePublicKey(input: string): string | undefined {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const parsed = tryParseNostrLink(trimmed);
    return parsed?.id ?? trimmed;
  }

  async function encryptMessage() {
    const key = useCustomEncryptKey
      ? parsePublicKey(encryptKey)
      : NostrProfile.id;
    if (!message.trim() || !key) return;

    const signer = LoginState.getSigner();
    const encrypted = await signer.signer.nip44Encrypt(message, key);
    setEncryptedMessage(encrypted);
  }

  async function decryptMessage() {
    const key = useCustomKey ? parsePublicKey(decryptKey) : NostrProfile.id;
    if (!encryptedInput.trim() || !key) return;

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-base mb-2">
          <FormattedMessage defaultMessage="Encrypt Message" />
        </div>
        <p className="text-cyber-muted text-sm mb-4">
          <FormattedMessage defaultMessage="Use NIP-44 encryption to send a secure message. This proves you own the private key associated with your account. Encrypt your message below and include the encrypted text in your email." />
        </p>
        <p className="text-cyber-muted text-xs mb-4">
          <FormattedMessage
            defaultMessage="Support pubkey: {npub}"
            values={{ npub: supportNpub }}
          />
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={useCustomEncryptKey}
            onChange={(e) => setUseCustomEncryptKey(e.target.checked)}
          />
          <label className="text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="Use custom recipient key" />
          </label>
        </div>

        {useCustomEncryptKey && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="Recipient's public key (npub/nprofile/hex):" />
            </label>
            <input
              type="text"
              className="w-full bg-cyber-panel-light rounded-sm p-3 text-sm"
              placeholder={formatMessage({
                defaultMessage: "npub1..., nprofile1..., or hex",
              })}
              value={encryptKey}
              onChange={(e) => setEncryptKey(e.target.value)}
            />
          </div>
        )}

        <textarea
          className="w-full bg-cyber-panel-light rounded-sm p-3 min-h-32 resize-y"
          placeholder={formatMessage({
            defaultMessage: "Type your message here...",
          })}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="mt-2">
          <AsyncButton onClick={encryptMessage} disabled={!message.trim()}>
            <FormattedMessage defaultMessage="Encrypt Message" />
          </AsyncButton>
        </div>

        {encryptedMessage && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="Encrypted message (copy and include in your email):" />
            </p>
            <pre className="bg-cyber-panel rounded-sm px-3 py-2 text-sm break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
              {encryptedMessage}
            </pre>
            <CopyButton
              text={encryptedMessage}
              label={formatMessage({ defaultMessage: "Copy to Clipboard" })}
            />
          </div>
        )}
      </div>

      <div className="border-t border-cyber-border pt-4">
        <div className="text-base mb-2">
          <FormattedMessage defaultMessage="Decrypt Message" />
        </div>
        <p className="text-cyber-muted text-sm mb-4">
          <FormattedMessage defaultMessage="Decrypt a message sent to you by support." />
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={useCustomKey}
            onChange={(e) => setUseCustomKey(e.target.checked)}
          />
          <label className="text-cyber-muted text-sm">
            <FormattedMessage defaultMessage="Use custom sender key" />
          </label>
        </div>

        {useCustomKey && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="Sender's public key (npub/nprofile/hex):" />
            </label>
            <input
              type="text"
              className="w-full bg-cyber-panel-light rounded-sm p-3 text-sm"
              placeholder={formatMessage({
                defaultMessage: "npub1..., nprofile1..., or hex",
              })}
              value={decryptKey}
              onChange={(e) => setDecryptKey(e.target.value)}
            />
          </div>
        )}

        <textarea
          className="w-full bg-cyber-panel-light rounded-sm p-3 min-h-32 resize-y"
          placeholder={formatMessage({
            defaultMessage: "Paste encrypted message here...",
          })}
          value={encryptedInput}
          onChange={(e) => setEncryptedInput(e.target.value)}
        />

        <div className="mt-2">
          <AsyncButton
            onClick={decryptMessage}
            disabled={!encryptedInput.trim()}
          >
            <FormattedMessage defaultMessage="Decrypt Message" />
          </AsyncButton>
        </div>

        {decryptError && (
          <div className="mt-4 p-3 bg-cyber-danger/10 border border-cyber-danger rounded-sm text-cyber-danger text-sm">
            {decryptError}
          </div>
        )}

        {decryptedMessage && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="Decrypted message:" />
            </p>
            <pre className="bg-cyber-panel rounded-sm px-3 py-2 text-sm break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
              {decryptedMessage}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
