import useLogin from "../hooks/login";
import ContactForm, { ContactFormData } from "../components/contact-form";
import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import { FormattedMessage } from "react-intl";

export function ContactPage() {
  const login = useLogin();

  async function handleSubmit(data: ContactFormData) {
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    await api.submitContactForm({
      ...data,
      user_pubkey: login?.publicKey || "",
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Contact Us" />
      </div>

      <div className="text-cyber-muted text-sm">
        <FormattedMessage defaultMessage="Have questions, feedback, or need support? Fill out the form below and we'll get back to you as soon as possible." />
      </div>

      <ContactForm onSubmit={handleSubmit} />

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
