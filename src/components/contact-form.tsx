import { useState } from "react";
import { AsyncButton } from "./button";
import { Turnstile } from "@marsidev/react-turnstile";

export interface ContactFormData {
  subject: string;
  message: string;
  name: string;
  email: string;
  turnstile_token: string;
}

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      setName("");
      setEmail("");
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
      <div className="flex flex-col gap-3">
        <div className="p-4 bg-cyber-primary/10 border border-cyber-primary rounded text-cyber-primary">
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
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-3 bg-cyber-danger/10 border border-cyber-danger rounded text-cyber-danger text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-cyber-muted text-sm mb-2">Subject *</label>
        <input
          type="text"
          className="w-full bg-cyber-panel-light rounded p-3 text-sm"
          placeholder="What is this regarding?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">Message *</label>
        <textarea
          className="w-full bg-cyber-panel-light rounded p-3 min-h-32 resize-y text-sm"
          placeholder="Please describe your question or issue in detail..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">Name *</label>
        <input
          type="text"
          className="w-full bg-cyber-panel-light rounded p-3 text-sm"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-cyber-muted text-sm mb-2">Email *</label>
        <input
          type="email"
          className="w-full bg-cyber-panel-light rounded p-3 text-sm"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Turnstile
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        onSuccess={(token) => setTurnstileToken(token)}
        onExpire={() => setTurnstileToken("")}
        onError={() => setTurnstileToken("")}
      />

      <AsyncButton onClick={handleSubmit} disabled={!formValid || loading}>
        {loading ? "Sending..." : "Send Message"}
      </AsyncButton>
    </div>
  );
}
