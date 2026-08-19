import useLogin from "../hooks/login";
import { hexToBech32 } from "@snort/shared";
import { useEffect, useState } from "react";
import ContactForm, { ContactFormData } from "../components/contact-form";
import { ApiUrl } from "../const";
import { LoginState } from "../login";
import { AccountDetail, LNVpsApi } from "../api";
import { EventKind, EventBuilder } from "@snort/system";
import { PageHeader, SectionCard } from "../components/section";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import useSupportChatAvailable from "../hooks/support-chat";

export function AccountSupportPage() {
  const login = useLogin();
  const [account, setAccount] = useState<AccountDetail>();
  // Not every deployment runs the support agent; offering a chat that cannot
  // connect is worse than not offering one, so the card waits for the probe.
  const chatAvailable = useSupportChatAvailable();

  useEffect(() => {
    login?.api.getAccount().then(setAccount);
  }, [login]);

  // Token accounts (OAuth / passkey) have no Nostr key, so no npub and no
  // signer to sign the message with.
  const isNostrless = login?.isNostrless ?? false;
  const npub =
    login?.publicKey && !isNostrless
      ? hexToBech32("npub", login.publicKey)
      : "";
  const subjectLine = npub ? `[${npub}] Account Query` : "Account Query";

  async function handleContactSubmit(data: ContactFormData) {
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    const subject = npub ? `[${npub}] ${data.subject}` : data.subject;

    // Nostr accounts sign the message with their key and append the signature
    // so support can verify authenticity; OAuth accounts have no signer, so the
    // message is sent as plain text (same as the public contact form).
    let message = data.message;
    if (!isNostrless) {
      const ev = await LoginState.getSigner().generic((eb: EventBuilder) =>
        eb
          // Ephemeral kind (NIP-16, 20000-29999): relays don't store it.
          .kind(21120 as EventKind)
          .content(data.message)
          // Protected marker (NIP-70): only the author may publish it.
          .tag(["-"]),
      );
      message = `${data.message}\n\n-----BEGIN NOSTR SIGNATURE-----\n${JSON.stringify(ev)}\n-----END NOSTR SIGNATURE-----`;
    }

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
      <PageHeader
        title={<FormattedMessage defaultMessage="Support" />}
        description={
          <FormattedMessage defaultMessage="Reach the team directly — we'll get back to you." />
        }
      />

      {chatAvailable && (
        <SectionCard
          title={<FormattedMessage defaultMessage="Live Chat" />}
          description={
            <FormattedMessage defaultMessage="Chat with the LNVPS support agent. It can look up your account, VMs and payments, and start, stop or restart a VM. It can't extend, refund or delete — use the form below for those." />
          }
        >
          <Link
            to="/account/support/chat"
            className="inline-block rounded-sm border border-cyber-border px-4 py-2 text-sm font-medium hover:border-cyber-primary hover:text-cyber-primary"
          >
            <FormattedMessage defaultMessage="Start Chat" />
          </Link>
        </SectionCard>
      )}

      <SectionCard
        title={<FormattedMessage defaultMessage="Contact Support" />}
        description={
          isNostrless ? (
            <FormattedMessage defaultMessage="Send us a message directly and the team will get back to you." />
          ) : (
            <FormattedMessage defaultMessage="Send us a message directly. Your public key will be included automatically." />
          )
        }
      >
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
                  href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL}?subject=${encodeURIComponent(subjectLine)}`}
                  className="text-cyber-accent underline"
                >
                  {import.meta.env.VITE_CONTACT_EMAIL}
                </a>
              ),
            }}
          />
        </p>
      </SectionCard>
    </div>
  );
}
