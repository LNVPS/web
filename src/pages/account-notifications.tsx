import { Link } from "react-router-dom";
import Nip17DM from "../components/nip17-dm";
import useLogin from "../hooks/login";
import { PageHeader } from "../components/section";
import { FormattedMessage } from "react-intl";

/**
 * The NIP-17 inbox, presented as what it now is: the delivery record for
 * platform notifications.
 *
 * Nostr DM is a notification channel (`contact_nip17`) and is on by default for
 * Nostr accounts, so what lands here is expiry warnings, payment receipts and
 * provisioning notices — not a support conversation. Replies are not monitored;
 * support goes through /account/support.
 */
export function AccountNotificationsPage() {
  const login = useLogin();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={<FormattedMessage defaultMessage="Notifications" />}
        description={
          <FormattedMessage defaultMessage="Notifications LNVPS has sent you as encrypted NIP-17 direct messages." />
        }
      />
      {login?.isNostrless ? (
        <div className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 text-sm text-cyber-muted">
          <FormattedMessage
            defaultMessage="Nostr DM notifications are only available for Nostr accounts, and yours has no Nostr key to decrypt them with. Choose another channel in {settings}."
            values={{
              settings: (
                <Link
                  to="/account/settings"
                  className="text-cyber-accent underline"
                >
                  <FormattedMessage defaultMessage="notification settings" />
                </Link>
              ),
            }}
          />
        </div>
      ) : (
        <>
          <p className="text-cyber-muted text-sm">
            <FormattedMessage
              defaultMessage="Expiry warnings, payment receipts and provisioning notices arrive here while the Nostr DM channel is enabled in {settings}. This inbox isn't monitored for replies. To reach a human, use {support}."
              values={{
                settings: (
                  <Link
                    to="/account/settings"
                    className="text-cyber-accent underline"
                  >
                    <FormattedMessage defaultMessage="notification settings" />
                  </Link>
                ),
                support: (
                  <Link
                    to="/account/support"
                    className="text-cyber-accent underline"
                  >
                    <FormattedMessage defaultMessage="Support" />
                  </Link>
                ),
              }}
            />
          </p>
          <Nip17DM />
        </>
      )}
    </div>
  );
}
