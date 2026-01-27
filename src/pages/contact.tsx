import { useState } from "react";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { Turnstile } from "@marsidev/react-turnstile";
import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";

interface ContactFormData {
  subject: string;
  message: string;
  email: string;
  name: string;
}

export function ContactPage() {
  const login = useLogin();
  const [formData, setFormData] = useState<ContactFormData>({
    subject: "",
    message: "",
    email: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit() {
    if (
      !formData.subject.trim() ||
      !formData.message.trim() ||
      !formData.name.trim() ||
      !formData.email.trim()
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the captcha verification");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const api = new LNVpsApi(ApiUrl, undefined, 5000);

      await api.submitContactForm({
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        user_pubkey: login?.publicKey || "",
        timestamp: new Date().toISOString(),
        turnstile_token: turnstileToken,
      });

      setSuccess(true);
      setFormData({
        subject: "",
        message: "",
        email: "",
        name: "",
      });
      setTurnstileToken("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to send message. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xl">Message Sent</div>
        <div className="p-4 bg-green-900/50 border border-green-500 rounded-md text-green-200">
          Thank you for contacting us. We'll get back to you as soon as
          possible.
        </div>
        <AsyncButton onClick={() => setSuccess(false)}>
          Send Another Message
        </AsyncButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Contact Us</div>

      <div className="text-neutral-400 text-sm">
        Have questions, feedback, or need support? Fill out the form below and
        we'll get back to you as soon as possible.
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-neutral-400 text-sm mb-2">
            Subject *
          </label>
          <input
            type="text"
            className="w-full bg-neutral-800 rounded-md p-3 text-sm"
            placeholder="What is this regarding?"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-sm mb-2">
            Message *
          </label>
          <textarea
            className="w-full bg-neutral-800 rounded-md p-3 min-h-32 resize-y text-sm"
            placeholder="Please describe your question or issue in detail..."
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-sm mb-2">Name *</label>
          <input
            type="text"
            className="w-full bg-neutral-800 rounded-md p-3 text-sm"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-sm mb-2">Email *</label>
          <input
            type="email"
            className="w-full bg-neutral-800 rounded-md p-3 text-sm"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <Turnstile
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
        />

        {login && (
          <div className="text-xs text-neutral-500">
            Logged in as: {login.publicKey?.slice(0, 8)}...
            {login.publicKey?.slice(-8)}
          </div>
        )}

        <AsyncButton
          onClick={handleSubmit}
          disabled={
            !formData.subject.trim() ||
            !formData.message.trim() ||
            !formData.name.trim() ||
            !formData.email.trim() ||
            !turnstileToken ||
            loading
          }
        >
          {loading ? "Sending..." : "Send Message"}
        </AsyncButton>
      </div>

      <div className="text-xs text-neutral-500 mt-4">
        <div className="font-medium mb-1">Other ways to reach us:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Nostr: {import.meta.env.VITE_NOSTR_PROFILE || "@lnvps"}</li>
          <li>GitHub: Create an issue at github.com/LNVPS</li>
          <li>Email: {import.meta.env.VITE_CONTACT_EMAIL}</li>
        </ul>
      </div>
    </div>
  );
}
