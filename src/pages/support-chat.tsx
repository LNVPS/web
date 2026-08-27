import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/section";
import Seo from "../components/seo";
import SupportChat from "../components/support-chat";
import useLogin from "../hooks/login";
import useSupportChatAvailable from "../hooks/support-chat";

/**
 * The public live chat with the AI support agent, at `/contact/chat`.
 *
 * A page of its own rather than a panel on `/contact` so the chat has a URL:
 * support can link a visitor straight to it, it survives a refresh, and the
 * contact form is not sharing a screen with a conversation.
 *
 * Serves both audiences, because who is asking is a property of the visitor
 * rather than of the page: {@link SupportChat} opens a guest session when
 * nobody is logged in and an account session when someone is, and the copy
 * follows that. A guest gets the public catalogue only — plans, regions,
 * operating systems, payment — so the page says so before the visitor spends a
 * question finding out.
 */
export function SupportChatPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  // undefined while probing: don't open a socket, and don't claim the feature
  // is missing, until we know.
  const chatAvailable = useSupportChatAvailable();

  // Chat exists but guest sessions are switched off, or the deployment runs no
  // agent at all. Either way a logged-out visitor cannot be served here: say
  // so and point at the form, rather than sitting on "Connecting..." against a
  // socket that will be refused.
  const refused =
    chatAvailable !== undefined &&
    (!chatAvailable.available || (!login && !chatAvailable.anonymous));

  return (
    <div className="flex flex-col gap-4">
      <Seo
        title={formatMessage({ defaultMessage: "Live Chat with LNVPS Support" })}
        canonical="/contact/chat"
        description={formatMessage({
          defaultMessage:
            "Chat with the LNVPS support agent about plans, regions, operating systems and Lightning payments. No account needed.",
        })}
      />
      <PageHeader
        title={<FormattedMessage defaultMessage="Live Chat" />}
        description={
          login ? (
            <FormattedMessage defaultMessage="Chat with the LNVPS support agent. It can look up your account, VMs and payments, and start, stop or restart a VM." />
          ) : (
            <FormattedMessage defaultMessage="Chat with the LNVPS support agent about plans and pricing, regions, operating systems or how paying with Lightning works. Log in first if your question is about an existing VM or payment, so it can look up your account." />
          )
        }
      />

      {refused ? (
        <div className="rounded-sm border border-cyber-border bg-cyber-panel p-4 text-sm text-cyber-muted">
          <FormattedMessage
            defaultMessage="Live chat isn't available right now. {link} and the team will get back to you."
            values={{
              link: (
                <Link to="/contact" className="text-cyber-accent underline">
                  <FormattedMessage defaultMessage="Send us a message" />
                </Link>
              ),
            }}
          />
        </div>
      ) : (
        chatAvailable && (
          <SupportChat
            emptyState={
              login ? (
                <FormattedMessage defaultMessage="Ask anything about your account: billing, a VM that won't boot, or what a charge was for." />
              ) : (
                <FormattedMessage defaultMessage="Ask about plans and pricing, which regions and operating systems we offer, or how paying with Lightning works." />
              )
            }
          />
        )
      )}

      <p className="m-0 text-xs text-cyber-muted">
        <FormattedMessage
          defaultMessage="The agent can't extend, refund or delete a VM, and it can't act on an account it isn't logged into. For those, {link}."
          values={{
            link: (
              <Link to="/contact" className="text-cyber-accent underline">
                <FormattedMessage defaultMessage="contact support by email" />
              </Link>
            ),
          }}
        />
      </p>
    </div>
  );
}
