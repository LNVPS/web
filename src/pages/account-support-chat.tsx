import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/section";
import Seo from "../components/seo";
import SupportChat from "../components/support-chat";
import useSupportChatAvailable from "../hooks/support-chat";

/**
 * The account-side live chat with the AI support agent.
 *
 * Everything about the socket lives in {@link SupportChat}; this page supplies
 * the framing and the copy specific to a logged-in customer, whose session gets
 * the account tools — the agent can read their account, VMs, payments and VM
 * history, and can start/stop/restart VMs. It deliberately cannot extend,
 * refund or delete — those go to the contact form on /account/support.
 */
export function AccountSupportChatPage() {
  // undefined while probing: don't claim the feature is missing until we know.
  const chatAvailable = useSupportChatAvailable();

  // Reached by a stale link or a direct URL on a deployment that doesn't run
  // the agent: say so and point at email support, rather than sitting on
  // "Connecting..." against a route that returns 404.
  if (chatAvailable?.available === false) {
    return (
      <div className="flex flex-col gap-4">
        <Seo noindex={true} />
        <PageHeader
          title={<FormattedMessage defaultMessage="Support Chat" />}
        />
        <div className="rounded-sm border border-cyber-border bg-cyber-panel p-4 text-sm text-cyber-muted">
          <FormattedMessage
            defaultMessage="Live chat isn't available right now. {link} and the team will get back to you."
            values={{
              link: (
                <Link
                  to="/account/support"
                  className="text-cyber-accent underline"
                >
                  <FormattedMessage defaultMessage="Send us a message" />
                </Link>
              ),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <PageHeader
        title={<FormattedMessage defaultMessage="Support Chat" />}
        description={
          <FormattedMessage defaultMessage="Chat with the LNVPS support agent. It can look up your account, VMs and payments, and start, stop or restart a VM." />
        }
      />

      {chatAvailable && (
        <SupportChat
          emptyState={
            <FormattedMessage defaultMessage="Ask anything about your account: billing, a VM that won't boot, or what a charge was for. For refunds, extensions or deletions, use the contact form instead." />
          }
        />
      )}

      <p className="m-0 text-xs text-cyber-muted">
        <FormattedMessage
          defaultMessage="The agent can't extend, refund or delete a VM. For those, {link}."
          values={{
            link: (
              <Link
                to="/account/support"
                className="text-cyber-accent underline"
              >
                <FormattedMessage defaultMessage="contact support by email" />
              </Link>
            ),
          }}
        />
      </p>
    </div>
  );
}
