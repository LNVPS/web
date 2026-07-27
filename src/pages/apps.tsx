import type { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import { AppCard } from "./account-apps";
import { CostPlanIntervalType, type App } from "../api";
import type { AppsLoaderData } from "../loaders";

/**
 * The cheapest thing on the page, for the lead's price anchor.
 *
 * Only comparable prices are considered: a single currency, and a one-month
 * billing interval so the "/month" the label prints is the real one. Returns
 * undefined when the catalog does not satisfy that, so the caller drops the
 * clause rather than anchoring on a number that means something else.
 */
function cheapestMonthly(apps: App[]): App | undefined {
  const monthly = apps.filter(
    (a) =>
      a.interval_type === CostPlanIntervalType.MONTH && a.interval_amount === 1,
  );
  if (monthly.length === 0) return undefined;
  if (new Set(monthly.map((a) => a.currency)).size > 1) return undefined;
  return monthly.reduce((min, a) => (a.amount < min.amount ? a : min));
}

function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-base text-cyber-text-bright">{title}</h2>
      <p className="m-0 text-sm text-cyber-muted">{children}</p>
    </div>
  );
}

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
  const cheapest = cheapestMonthly(catalog);

  return (
    <div className="flex flex-col gap-6">
      {catalog.length > 0 ? (
        <Seo
          title={formatMessage({
            defaultMessage: "Managed App Hosting — No Server to Run",
          })}
          canonical="/apps"
          description={formatMessage({
            defaultMessage:
              "Deploy an app on LNVPS — up in minutes on its own hostname, TLS and storage included, no OS to patch. Nostr relays and Blossom media servers today.",
          })}
        />
      ) : (
        // No catalog means the fetch failed or returned nothing. The copy below
        // still renders, but a catalog page with no catalog is broken, not a
        // page worth ranking. Same reasoning as `/apps/:id`: keep it out of the
        // index rather than serve a soft 404 (`renderPage` returns 200 always).
        <Seo noindex={true} />
      )}

      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl">
          <FormattedMessage defaultMessage="Managed Apps: run the software without running the server" />
        </h1>
        <p className="m-0 max-w-prose text-cyber-muted">
          <FormattedMessage defaultMessage="Pick an app, give it a name, pay. It comes up on its own hostname with TLS already working — no OS to patch, no Docker to configure, no certificate to renew." />
          {cheapest && (
            <>
              {" "}
              <FormattedMessage
                defaultMessage="From {price}."
                values={{
                  price: (
                    <CostAmount
                      cost={{
                        currency: cheapest.currency,
                        amount: cheapest.amount,
                        interval_type: cheapest.interval_type,
                      }}
                      converted={false}
                      taxable
                    />
                  ),
                }}
              />
            </>
          )}
        </p>
      </div>

      {catalog.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((a) => (
            <AppCard key={a.id} app={a} />
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <Block
          title={
            <FormattedMessage defaultMessage="Its own hostname, TLS included" />
          }
        >
          <FormattedMessage
            defaultMessage="Every deployment gets {host} with a certificate issued automatically. Bring your own domain and point a CNAME at it — we serve that too, with its own certificate, issued once DNS resolves."
            values={{
              host: (
                <span className="font-mono text-cyber-accent">
                  your-name.ie.apps.lnvps.cloud
                </span>
              ),
            }}
          />
        </Block>
        <Block
          title={<FormattedMessage defaultMessage="Stopping keeps your data" />}
        >
          <FormattedMessage defaultMessage="Stopping a deployment scales it to zero and keeps the storage. Your data is still there when you start it again. Only deleting removes it." />
        </Block>
        <Block
          title={
            <FormattedMessage defaultMessage="Lightning, on-chain, or card" />
          }
        >
          <FormattedMessage defaultMessage="Billing works like a VPS subscription, with no setup fee on any app." />
        </Block>
      </div>

      <p className="m-0 max-w-prose text-sm text-cyber-muted">
        <FormattedMessage
          defaultMessage="Running in Dublin, Ireland. If you want the whole machine rather than the app on it, the <vps>VPS</vps> is still there — Managed Apps do not replace it."
          values={{
            vps: (chunks: ReactNode) => (
              <Link to="/" className="text-cyber-primary hover:underline">
                {chunks}
              </Link>
            ),
          }}
        />
      </p>
    </div>
  );
}
