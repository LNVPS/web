import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { relayApps, catalogPriceFrom } from "../utils/relay-catalog";
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
 * `/lightning-node-vps` — use-case landing page for running a Lightning node
 * on an LNVPS VPS (`LNVPS/web#50`).
 *
 * **This is a VPS page, not a Managed App page.** There is no managed
 * Lightning node in the catalog, so it links to the VPS order flow and never
 * to `/apps`. Nothing here is templated off `/blossom-server-hosting` or
 * `/nostr-relay-hosting`, and the three regions named below are the VPS
 * regions — the other two pages are Dublin only.
 *
 * It shares `appsLoader` with `/apps` and `/nostr-relay-hosting` for one
 * reason: the relay cross-sell near the bottom quotes a price, and that price
 * comes from the catalog like every other price on the site. Nothing else on
 * the page is fetched.
 *
 * The `Offer`-on-VPS-plans schema this page wants is `LNVPS/web#20`, still
 * open — Alejandra's call was to ship the page now and add the product markup
 * with #20 rather than hold a ranking surface for a markup nicety. The
 * `FAQPage` block ships today.
 *
 * The Tor and no-KYC lines are policy statements. They are true today, and
 * they are the two claims on this page that go silently wrong if policy
 * changes — they have no code behind them to break first.
 */
export function LightningNodeVpsPage() {
  const { formatMessage } = useIntl();
  const { apps } = useLoaderData<AppsLoaderData>();

  // The cross-sell quotes the relay apps' price, so read it off the same
  // catalog rows `/nostr-relay-hosting` reads, through the same helper — the
  // two pages cannot quote different money. Undefined when the catalog gave us
  // nothing, and the sentence then drops the figure rather than stating one
  // the front end cannot verify (`LNVPS/web#67`).
  const relayCost = catalogPriceFrom(relayApps(apps));

  // Rendered as the FAQ block *and* handed to `faqJsonLd`, so the markup a
  // crawler reads and the text a visitor reads cannot drift. On this page the
  // FAQ is the body, not an appendix: each answer is a yes/no against one
  // requirement, which is why they are this short. Ship as written.
  const faq: FaqItem[] = [
    {
      question: formatMessage({
        defaultMessage: "Can I run LND / Core Lightning / Eclair?",
      }),
      answer: formatMessage({
        defaultMessage: "Yes. It is your machine, install what you like.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do you allow Tor?" }),
      answer: formatMessage({ defaultMessage: "Yes." }),
    },
    {
      question: formatMessage({ defaultMessage: "Is traffic metered?" }),
      answer: formatMessage({
        defaultMessage: "No. Every plan includes unmetered traffic.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do I get a static IP?" }),
      answer: formatMessage({
        defaultMessage: "Yes, one IPv4 and one IPv6 on every plan.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do you need my identity?" }),
      answer: formatMessage({
        defaultMessage: "No. Sign up with a Nostr key and pay in sats.",
      }),
    },
  ];

  return (
    <>
      <Seo
        title={formatMessage({
          defaultMessage: "Lightning Node VPS Hosting: Pay with Lightning",
        })}
        canonical="/lightning-node-vps"
        description={formatMessage({
          defaultMessage:
            "A VPS built for a Lightning node, with static IPv4 and IPv6, unmetered traffic, Tor permitted and no KYC. Dublin, London or Quebec. Pay with Lightning itself.",
        })}
        jsonLd={faqJsonLd(faq)}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            <FormattedMessage defaultMessage="Run your Lightning node on a VPS built for it" />
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Static addressing, unmetered traffic, Tor permitted, and no KYC. Pay for it with Lightning. We run our own node, so your payment never touches a processor." />
          </p>
        </header>

        <Section
          title={
            <FormattedMessage defaultMessage="Why this VPS for a Lightning node" />
          }
        >
          <div className="flex max-w-prose flex-col gap-3 text-cyber-text">
            <p className="m-0">
              <FormattedMessage
                defaultMessage="<b>Static IPv4 and IPv6 on every plan.</b> An announced node needs an address that does not move. Both are included, not an add-on."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </p>
            <p className="m-0">
              <FormattedMessage
                defaultMessage="<b>Unmetered traffic.</b> A routing node gossips constantly. You should not be watching a bandwidth meter."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </p>
            <p className="m-0">
              <FormattedMessage
                defaultMessage="<b>Tor is permitted.</b> Run your node over Tor if you want to. We do not block it, and we do not use Google captchas."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </p>
            <p className="m-0">
              <FormattedMessage
                defaultMessage="<b>No KYC.</b> No personal information to sign up. Your node, your keys, your business."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </p>
            <p className="m-0">
              <FormattedMessage
                defaultMessage="<b>Pay with Lightning.</b> There is a certain symmetry to funding your Lightning node over Lightning, and we settle it through our own LND node rather than a third-party processor."
                values={{
                  b: (chunks) => (
                    <b className="text-cyber-text-bright">{chunks}</b>
                  ),
                }}
              />
            </p>
          </div>
        </Section>

        <Section title={<FormattedMessage defaultMessage="Where" />}>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Dublin (IE), London (GB) or Quebec (CA). Dublin has the deepest capacity if you need a large node, up to 64 vCPU and 128 GB RAM." />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="Sizing" />}>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Build exactly what you need. CPU, memory and storage are configured independently, SSD or HDD, rather than forced into fixed tiers." />
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
            to="/order"
            className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            <FormattedMessage defaultMessage="Build your node's VPS" />
          </Link>
        </div>

        <Section title={<FormattedMessage defaultMessage="Also on LNVPS" />}>
          <p className="m-0 max-w-prose text-cyber-text">
            {relayCost ? (
              <FormattedMessage
                defaultMessage="Running a Nostr relay too? That one does not need a whole server. It is <a>from {price} a month as a Managed App</a>."
                values={{
                  price: <CostAmount cost={relayCost} converted={false} />,
                  a: (chunks) => (
                    <Link
                      to="/nostr-relay-hosting"
                      className="text-cyber-primary hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                defaultMessage="Running a Nostr relay too? That one does not need a whole server. It is <a>available as a Managed App</a>."
                values={{
                  a: (chunks) => (
                    <Link
                      to="/nostr-relay-hosting"
                      className="text-cyber-primary hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                }}
              />
            )}
          </p>
        </Section>
      </div>
    </>
  );
}
