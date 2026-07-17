import useLogin from "../hooks/login";
import { hexToBech32 } from "@snort/shared";
import { useEffect, useState } from "react";
import Collapsible from "../components/collapsible";
import ContactForm, { ContactFormData } from "../components/contact-form";
import Nip44Tools from "../components/nip44-tools";
import { ApiUrl, SupportPubkey } from "../const";
import { LoginState } from "../login";
import { AccountDetail, LNVpsApi } from "../api";
import { FormattedMessage } from "react-intl";

export function AccountSupportPage() {
  const login = useLogin();
  const [account, setAccount] = useState<AccountDetail>();

  useEffect(() => {
    login?.api.getAccount().then(setAccount);
  }, [login]);

  // Token accounts (OAuth / passkey) have no Nostr key, so no npub and no
  // NIP-44 signer.
  const isNostrless = login?.isNostrless ?? false;
  const npub =
    login?.publicKey && !isNostrless
      ? hexToBech32("npub", login.publicKey)
      : "";
  const subjectLine = npub ? `[${npub}] Account Query` : "Account Query";

  async function handleContactSubmit(data: ContactFormData) {
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    const subject = npub ? `[${npub}] ${data.subject}` : data.subject;

    // Nostr accounts encrypt the message to support with NIP-44; OAuth accounts
    // have no signer, so the message is sent as plain text (same as the public
    // contact form).
    const message = isNostrless
      ? data.message
      : await LoginState.getSigner().signer.nip44Encrypt(
          data.message,
          SupportPubkey,
        );

    await api.submitContactForm({
      ...data,
      subject,
      message,
      user_pubkey: login?.publicKey || "",
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Support" />
      </div>

      <div className="border-t border-cyber-border pt-4">
        <div className="text-lg mb-2">
          <FormattedMessage defaultMessage="Contact Support" />
        </div>
        <p className="text-cyber-muted text-sm mb-4">
          {isNostrless ? (
            <FormattedMessage defaultMessage="Send us a message directly and the team will get back to you." />
          ) : (
            <FormattedMessage defaultMessage="Send us a message directly. Your public key will be included automatically." />
          )}
        </p>

        <ContactForm
          onSubmit={handleContactSubmit}
          initialName={account?.name}
          initialEmail={account?.email}
        />

        <p className="text-cyber-muted text-xs mt-3">
          <FormattedMessage
            defaultMessage="Or email us directly at {email}"
            values={{
              email: (
                <a
                  href={`mailto:sales@lnvps.net?subject=${encodeURIComponent(subjectLine)}`}
                  className="text-cyber-accent underline"
                >
                  sales@lnvps.net
                </a>
              ),
            }}
          />
        </p>
      </div>

      {/* NIP-44 tooling needs the account's Nostr signer, which token
          accounts don't have. */}
      {!isNostrless && (
        <Collapsible
          title={<FormattedMessage defaultMessage="NIP-44 Encryption Tools" />}
        >
          <Nip44Tools />
        </Collapsible>
      )}
    </div>
  );
}
