import { useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { AppCard } from "./account-apps";
import type { AppsLoaderData } from "../loaders";

/**
 * The public catalog listing. `/apps/:id` is the product page for one app; this
 * is the page the launch copy's "browse the catalog" call to action points at,
 * so it has to server-render a real title, h1 and the app list.
 */
export function AppsPage() {
  const { formatMessage } = useIntl();
  const { apps } = useLoaderData<AppsLoaderData>();

  // The API returns the catalog in no particular order (today: 5, 3, 4, 2, 1),
  // so sort before rendering — a listing that reshuffles between renders is
  // worse for readers and gives crawlers a different page each fetch.
  const catalog = apps ? [...apps].sort((a, b) => a.id - b.id) : [];

  return (
    <div className="flex flex-col gap-6">
      {catalog.length > 0 ? (
        <Seo
          title={formatMessage({
            defaultMessage: "Managed Apps — One-Click Nostr and Blossom Hosting",
          })}
          canonical="/apps"
          description={formatMessage({
            defaultMessage:
              "Deploy a Nostr relay or a Blossom media server as a managed app on LNVPS. Provisioned in minutes with storage and TLS included — pay with Lightning, Bitcoin, or card.",
          })}
        />
      ) : (
        // No catalog means the fetch failed or returned nothing, and this page
        // is then a heading with no product under it. Same reasoning as
        // `/apps/:id`: keep an empty shell out of the index.
        <Seo noindex={true} />
      )}

      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl">
          <FormattedMessage defaultMessage="Managed Apps" />
        </h1>
        <p className="m-0 text-cyber-muted">
          <FormattedMessage defaultMessage="One-click Docker apps deployed on managed infrastructure." />
        </p>
      </div>

      {catalog.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((a) => (
            <AppCard key={a.id} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}
