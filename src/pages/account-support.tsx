import useLogin from "../hooks/login";
import { hexToBech32 } from "@snort/shared";
import Collapsible from "../components/collapsible";
import ContactForm, { ContactFormData } from "../components/contact-form";
import Nip44Tools from "../components/nip44-tools";
import { ApiUrl, NostrProfile } from "../const";
import { LoginState } from "../login";
import { LNVpsApi } from "../api";

export function AccountSupportPage() {
  const login = useLogin();

  const npub = hexToBech32("npub", login?.publicKey);
  const subjectLine = `[${npub}] Account Query`;

  async function handleContactSubmit(data: ContactFormData) {
    const signer = LoginState.getSigner();
    const encrypted = await signer.signer.nip44Encrypt(
      data.message,
      NostrProfile.id,
    );
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    await api.submitContactForm({
      ...data,
      subject: `[${npub}] ${data.subject}`,
      message: encrypted,
      user_pubkey: login?.publicKey || "",
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Support</div>

      <div className="flex flex-col gap-2">
        <p className="text-cyber-muted text-sm">
          Your Public Key (include this in all communications):
        </p>
        <pre className="bg-cyber-panel rounded px-3 py-2 select-all text-sm break-all">
          {npub}
        </pre>
      </div>

      <div className="border-t border-cyber-border pt-4">
        <div className="text-lg mb-2">Contact Support</div>
        <p className="text-cyber-muted text-sm mb-4">
          Send us a message directly. Your public key will be included
          automatically.
        </p>

        <ContactForm onSubmit={handleContactSubmit} />

        <p className="text-cyber-muted text-xs mt-3">
          Or email us directly at{" "}
          <a
            href={`mailto:sales@lnvps.net?subject=${encodeURIComponent(subjectLine)}`}
            className="text-cyber-accent underline"
          >
            sales@lnvps.net
          </a>
        </p>
      </div>

      <Collapsible title="NIP-44 Encryption Tools">
        <Nip44Tools />
      </Collapsible>
    </div>
  );
}
