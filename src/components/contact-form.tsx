import { useEffect, useState } from "react";
import { AsyncButton } from "./button";
import { Turnstile } from "@marsidev/react-turnstile";
import useTheme from "../hooks/theme";
import { FormattedMessage, useIntl } from "react-intl";

export interface ContactFormData {
  subject: string;
  message: string;
  name: string;
  email: string;
  turnstile_token: string;
}

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  /** Prefill values (e.g. from the logged-in account). */
  initialName?: string;
  initialEmail?: string;
}

export default function ContactForm({
  onSubmit,
  initialName,
  initialEmail,
}: ContactFormProps) {
  const { theme } = useTheme();
  const { formatMessage } = useIntl();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");

  // Prefill from the account once it loads, without clobbering anything the
  // user has already typed.
  useEffect(() => {
    if (initialName) setName((n) => (n ? n : initialName));
  }, [initialName]);
  useEffect(() => {
    if (initialEmail) setEmail((e) => (e ? e : initialEmail));
  }, [initialEmail]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const formValid =
    subject.trim() &&
    message.trim() &&
    name.trim() &&
    email.trim() &&
    turnstileToken;

  async function handleSubmit() {
    if (!formValid) {
      setError(
        formatMessage({ defaultMessage: "Please fill in all required fields" }),
      );
      return;
    }

    if (!turnstileToken) {
      setError(
        formatMessage({
          defaultMessage: "Please complete the captcha verification",
        }),
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        subject: subject.trim(),
        message: message.trim(),
        name: name.trim(),
        email: email.trim(),
        turnstile_token: turnstileToken,
      });

      setSuccess(true);
      setSubject("");
      setMessage("");
      setName(initialName ?? "");
      setEmail(initialEmail ?? "");
      setTurnstileToken("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({
              defaultMessage: "Failed to send message. Please try again.",
            }),
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-3">
        <div className="p-4 bg-cyber-primary/10 border border-cyber-primary rounded-sm text-cyber-primary">
          <FormattedMessage defaultMessage="Thank you for contacting us. We'll get back to you as soon as possible." />
        </div>
        <AsyncButton onClick={() => setSuccess(false)}>
          <FormattedMessage defaultMessage="Send Another Message" />
        </AsyncButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-3 bg-cyber-danger/10 border border-cyber-danger rounded-sm text-cyber-danger text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-cyber-muted text-sm mb-2">
          <FormattedMessage defaultMessage="Subject *" />
        </label>
        <input
          type="text"
          className="w-full bg-cyber-panel-light rounded-sm p-3 text-sm"
          placeholder={formatMessage({
            defaultMessage: "What is this regarding?",
          })}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">
          <FormattedMessage defaultMessage="Message *" />
        </label>
        <textarea
          className="w-full bg-cyber-panel-light rounded-sm p-3 min-h-32 resize-y text-sm"
          placeholder={formatMessage({
            defaultMessage:
              "Please describe your question or issue in detail...",
          })}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">
          <FormattedMessage defaultMessage="Name *" />
        </label>
        <input
          type="text"
          className="w-full bg-cyber-panel-light rounded-sm p-3 text-sm"
          placeholder={formatMessage({ defaultMessage: "Your name" })}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">
          <FormattedMessage defaultMessage="Email *" />
        </label>
        <input
          type="email"
          className="w-full bg-cyber-panel-light rounded-sm p-3 text-sm"
          placeholder={formatMessage({ defaultMessage: "your@email.com" })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Turnstile
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ""}
        options={{ theme: theme === "light" ? "light" : "dark" }}
        onSuccess={(token) => setTurnstileToken(token)}
        onExpire={() => setTurnstileToken("")}
        onError={() => setTurnstileToken("")}
      />

      <AsyncButton onClick={handleSubmit} disabled={!formValid || loading}>
        {loading ? (
          <FormattedMessage defaultMessage="Sending..." />
        ) : (
          <FormattedMessage defaultMessage="Send Message" />
        )}
      </AsyncButton>
    </div>
  );
}
