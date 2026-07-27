import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { appJsonLd } from "../utils/app-seo";
import { formatPriceText } from "../utils/currency";
import { relayApps, relayPrice } from "../utils/relay-catalog";
import BytesSize from "../components/bytes";
import type { AppsLoaderData } from "../loaders";

/** Section heading in the site's eyebrow style, kept as an h2 for structure.
 * Mirrors `SectionHeading` in `home.tsx:172`. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyber-muted">
      <span className="h-px w-3 bg-cyber-border-bright" />
      {children}
    </h2>
  );
}

function Section({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

/**
 * `/nostr-relay-hosting` — use-case landing page for the four relay apps in
 * the managed app catalog (`LNVPS/web#49`).
 *
 * The table is the catalog: one row per app `relayApps` found, with the
 * catalog's `display_name` and `storage_bytes`. The only column written here
 * is "Best for" — an editorial judgement with no field behind it — and it is
 * keyed by slug so a row's copy stays matched to its relay.
 *
 * Every price on the page — title, meta description, h1, the "all {price}"
 * line and the CTA — is a `{price}` placeholder fed from the catalog, falling
 * back to `RelayFallbackPrice` only when the API is unreachable or the relays
 * disagree. So the copy, the `Offer` markup and the `<title>` cannot disagree,
 * and no locale file carries the number.
 */
export function NostrRelayHostingPage() {
  const intl = useIntl();
  const { formatMessage } = intl;
  const { apps } = useLoaderData<AppsLoaderData>();

  const relays = relayApps(apps);

  // Ex-VAT and unconverted, matching the `Offer`'s `valueAddedTaxIncluded:
  // false` and what a crawler is served. No `interval_type`: the period is
  // part of the sentence around the placeholder, so "/month" and "a month"
  // stay translatable rather than being appended in a fixed position.
  const price = relayPrice(relays);
  const priceText = formatPriceText(intl, price);
  const priceNode = <CostAmount cost={price} converted={false} />;

  // "Best for" is the one column with no API field behind it — which relay
  // suits which job is an editorial call. Keyed by catalog slug so it stays
  // matched to its row; a relay the map does not know still renders, without
  // a recommendation, rather than dropping out of the table.
  const bestFor: Record<string, string> = {
    strfry: formatMessage({
      defaultMessage: "High throughput, large event volume",
    }),
    "nostr-rs-relay": formatMessage({
      defaultMessage: "Small, simple, Rust + SQLite",
    }),
    "pyramid-relay": formatMessage({
      defaultMessage: "Community relays with invite hierarchy",
    }),
    "haven-relay": formatMessage({
      defaultMessage:
        "Personal vault-style relay, with its own Blossom media store",
    }),
  };

  // Rendered as the FAQ block *and* handed to `faqJsonLd`, so the markup a
  // crawler reads and the text a visitor reads cannot drift. Answers ship as
  // written — expanding one usually costs `FAQPage` eligibility.
  const faq: FaqItem[] = [
    {
      question: formatMessage({ defaultMessage: "How long does it take?" }),
      answer: formatMessage({
        defaultMessage: "Minutes. It provisions once payment settles.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Can I use my own domain?" }),
      answer: formatMessage({
        defaultMessage:
          "Yes. Point a CNAME at your relay's hostname. We issue a separate certificate for it automatically once DNS resolves.",
      }),
    },
    {
      question: formatMessage({
        defaultMessage: "What happens to my events if I stop paying?",
      }),
      answer: formatMessage({
        defaultMessage:
          "Stopping scales the relay to zero and retains your storage — your event database is intact when you restart. Deleting is what removes data.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do I need an account?" }),
      answer: formatMessage({
        defaultMessage:
          "A Nostr key is enough. No email, no name, no KYC. Notifications can go to encrypted Nostr DM, email, Telegram or WhatsApp — your choice.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Where does it run?" }),
      answer: formatMessage({ defaultMessage: "Dublin, Ireland." }),
    },
    {
      question: formatMessage({
        defaultMessage: "Can I switch relay software later?",
      }),
      answer: formatMessage({
        defaultMessage:
          "Not in place — deploy the new one and migrate. They are separate deployments.",
      }),
    },
  ];

  return (
    <>
      <Seo
        title={formatMessage(
          {
            defaultMessage: "Nostr Relay Hosting from {price}/month",
          },
          { price: priceText },
        )}
        canonical="/nostr-relay-hosting"
        description={formatMessage(
          {
            defaultMessage:
              "Run your own Nostr relay for {price}/month — strfry, nostr-rs-relay, Pyramid or HAVEN, up in minutes on its own hostname with TLS and storage included.",
          },
          { price: priceText },
        )}
        jsonLd={[...relays.map(appJsonLd), faqJsonLd(faq)]}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            <FormattedMessage
              defaultMessage="Run your own Nostr relay — {price} a month"
              values={{ price: priceNode }}
            />
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="No server to rent. No OS to patch. No certificates to renew. Pick a relay, give it a name, pay, and it comes up on its own hostname with TLS already working." />
          </p>
        </header>

        <Section title={<FormattedMessage defaultMessage="Pick your relay" />}>
          <p className="m-0 text-cyber-text">
            {/*
              One string, not a derived/literal pair. `price` already carries
              the "only claim it when all four agree" rule — it is the catalog
              figure when they do and `RelayFallbackPrice` when they do not —
              so the copy no longer needs a second `defaultMessage` holding
              the written number.
            */}
            <FormattedMessage
              defaultMessage="Four relay implementations, all {price}/month, no setup fee."
              values={{
                price: (
                  <CostAmount
                    cost={price}
                    converted={false}
                    className="font-bold text-cyber-primary"
                  />
                ),
              }}
            />
          </p>
          {/*
            The table is the catalog, so it only exists when the catalog does.
            On a cold server start with the API unreachable `relays` is empty —
            the same state in which `/apps` renders no catalog — and a header
            row over nothing reads as a broken page, so drop the table instead.
            The sentence above ends in a full stop for that reason: it has to
            stand on its own when there is no table under it.
          */}
          {relays.length > 0 && (
            <div className="max-w-3xl overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-cyber-border text-xs uppercase tracking-[0.15em] text-cyber-muted">
                    <th className="py-2 pr-4 font-normal">
                      <FormattedMessage defaultMessage="Relay" />
                    </th>
                    <th className="py-2 pr-4 font-normal">
                      <FormattedMessage defaultMessage="Best for" />
                    </th>
                    <th className="py-2 font-normal">
                      <FormattedMessage defaultMessage="Storage" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/60">
                  {relays.map((a) => (
                    <tr key={a.name}>
                      {/* `nostr-rs-relay` otherwise breaks at its hyphens. */}
                      <td className="whitespace-nowrap py-2 pr-4 font-bold text-cyber-text-bright">
                        {a.display_name}
                      </td>
                      <td className="py-2 pr-4 text-cyber-text">
                        {bestFor[a.name]}
                      </td>
                      <td className="py-2 text-cyber-text">
                        <BytesSize value={a.storage_bytes} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage
              defaultMessage="Not sure? <b>strfry</b> is the workhorse — it is what most public relays run. <b>HAVEN</b> if this is your personal relay rather than a community one; it is the only one of the four that also gives you a Blossom media store, so your images live under the same key as your notes."
              values={{
                b: (chunks) => (
                  <b className="text-cyber-text-bright">{chunks}</b>
                ),
              }}
            />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="What is included" />}>
          <ul className="m-0 flex max-w-prose list-disc flex-col gap-1 pl-5 text-cyber-text">
            <li>
              <FormattedMessage
                defaultMessage="Your own hostname — <code>your-name.ie.apps.lnvps.cloud</code> — with a TLS certificate issued automatically"
                values={{
                  code: (chunks) => (
                    <code className="font-mono text-cyber-accent">
                      {chunks}
                    </code>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage defaultMessage="Persistent storage — sized per relay above" />
            </li>
            <li>
              <FormattedMessage defaultMessage="Isolated environment, not a shared box" />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="<b>Your own domain if you want it.</b> Point a CNAME at your relay and we serve it alongside the default hostname with its own certificate. No verification step — the certificate is issued when your DNS resolves."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="<b>Stopping keeps your data.</b> Pause a relay and the event database is still there when you start it again. Only deleting removes storage."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </li>
          </ul>
        </Section>

        <Section title={<FormattedMessage defaultMessage="Pay how you like" />}>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Lightning, on-chain Bitcoin, or card. No personal information required to sign up. Log in with your Nostr key — NIP-07 in the browser, NIP-98 for the API." />
          </p>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="We run our own Lightning node. Your sats do not route through a third-party processor." />
          </p>
        </Section>

        <Section
          title={
            <FormattedMessage defaultMessage="When you want the whole machine instead" />
          }
        >
          {/* The regions named here are the VPS regions. The managed relay
              above is Dublin only — do not merge the two lists. */}
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage
              defaultMessage="A Managed App is the right answer when the relay is the point. If you want to run a modified build, co-locate other services, or manage the box yourself, our <a>VPS hosting</a> starts in Dublin, London and Quebec with unmetered traffic and a static IPv4 and IPv6 on every plan."
              values={{
                a: (chunks) => (
                  <Link
                    to="/order"
                    className="text-cyber-primary hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              }}
            />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="FAQ" />}>
          <dl className="m-0 flex max-w-prose flex-col gap-4">
            {faq.map((f) => (
              <div key={f.question} className="flex flex-col gap-1">
                <dt className="m-0 font-bold text-cyber-text-bright">
                  {f.question}
                </dt>
                <dd className="m-0 text-cyber-text">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div>
          <Link
            to="/apps"
            className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            <FormattedMessage
              defaultMessage="Deploy your relay — {price}/month"
              values={{ price: priceNode }}
            />
          </Link>
        </div>
      </div>
    </>
  );
}
