import { AccountNostrDomains } from "../components/account-domains";
import { PageHeader } from "../components/section";
import Seo from "../components/seo";
import { FormattedMessage } from "react-intl";

export function AccountDomainsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <PageHeader
        title={<FormattedMessage defaultMessage="Nostr Domains" />}
        description={
          <FormattedMessage defaultMessage="Free NIP-05 identity hosting on domains you control." />
        }
      />
      <AccountNostrDomains />
    </div>
  );
}
