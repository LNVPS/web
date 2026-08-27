import { Link } from "react-router-dom";
import useLogin from "../hooks/login";
import ContactForm, { ContactFormData } from "../components/contact-form";
import { SectionCard } from "../components/section";
import useSupportChatAvailable from "../hooks/support-chat";
import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";

export function ContactPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  // undefined while the probe is in flight — render nothing rather than
  // flashing a chat card in and out on every load.
  const chatAvailable = useSupportChatAvailable();
  // A logged-out visitor needs the server to allow guest sessions; a logged-in
  // one connects with their own credentials and only needs chat to exist.
  // Offering it without checking renders a box that always refuses.
  const showChat =
    chatAvailable?.available === true &&
    (login !== undefined || chatAvailable.anonymous);

  async function handleSubmit(data: ContactFormData) {
    const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
    await api.submitContactForm({
      ...data,
      user_pubkey: login?.publicKey || "",
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo
        title={formatMessage({ defaultMessage: "Contact and Support" })}
        canonical="/contact"
        description={formatMessage({
          defaultMessage:
            "Get in touch with the LNVPS team. Have questions about our VPS hosting or payment options? We're here to help.",
        })}
      />
      <h1 className="text-3xl text-cyber-text-bright">
        <FormattedMessage defaultMessage="Contact LNVPS Support" />
      </h1>

      <p className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Have questions about provisioning, billing, abuse handling, or a specific service issue? We're here to help." />
      </p>

      {showChat && (
        <SectionCard
          title={<FormattedMessage defaultMessage="Live Chat" />}
          description={
            login ? (
              <FormattedMessage defaultMessage="Chat with the LNVPS support agent. It can look up your account, VMs and payments, and start, stop or restart a VM. It can't extend, refund or delete, so use the form below for those." />
            ) : (
              <FormattedMessage defaultMessage="Chat with the LNVPS support agent about plans and pricing, regions, operating systems or how paying with Lightning works. No login needed. Log in first if your question is about an existing VM or payment, so it can look up your account." />
            )
          }
        >
          {/* A link to the chat's own URL rather than a panel opened in place:
              the conversation is worth being able to bookmark, refresh and be
              linked to, and it does not have to share a screen with the form.
              It also means no socket is opened for a visitor who came here to
              write an email — guest connections are rate-limited per IP, which
              behind a shared NAT is a budget visitors spend on each other. */}
          <Link
            to="/contact/chat"
            className="inline-block rounded-sm border border-cyber-border px-4 py-2 text-sm font-medium hover:border-cyber-primary hover:text-cyber-primary"
          >
            <FormattedMessage defaultMessage="Start Chat" />
          </Link>
        </SectionCard>
      )}

      <SectionCard
        title={<FormattedMessage defaultMessage="Send a message" />}
        description={
          <FormattedMessage defaultMessage="Prefer email? Send a message and the LNVPS team will get back to you." />
        }
      >
        <ContactForm onSubmit={handleSubmit} />
      </SectionCard>

      {login && (
        <div className="text-xs text-cyber-muted">
          <FormattedMessage
            defaultMessage="Logged in as: {key}"
            values={{
              key: `${login.publicKey?.slice(0, 8)}...${login.publicKey?.slice(-8)}`,
            }}
          />
        </div>
      )}

      <div className="text-xs text-cyber-muted mt-4">
        <div className="font-medium mb-1">
          <FormattedMessage defaultMessage="Other ways to reach us:" />
        </div>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <FormattedMessage
              defaultMessage="Nostr: {handle}"
              values={{
                handle: import.meta.env.VITE_NOSTR_PROFILE || "@lnvps",
              }}
            />
          </li>
          <li>
            <FormattedMessage defaultMessage="GitHub: Create an issue at github.com/LNVPS" />
          </li>
          <li>
            <FormattedMessage
              defaultMessage="Email: {email}"
              values={{ email: import.meta.env.VITE_CONTACT_EMAIL }}
            />
          </li>
        </ul>
      </div>
    </div>
  );
}
