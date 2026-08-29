import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import RegionName from "../components/region-name";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { formatIntervalText, formatPriceText } from "../utils/currency";
import { vpnPriceFrom, vpnRegions, vpnServiceJsonLd } from "../utils/vpn-seo";
import type { VpnLoaderData } from "../loaders";

/** Section heading in the site's eyebrow style, kept as an h2 for structure. */
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
 * `/vpn` — the public page for the WireGuard plans, and the only VPN surface a
 * logged-out visitor or a crawler can reach: `/account/vpn` sells and manages
 * the same product behind the login gate.
 *
 * Every figure comes from `GET /api/v1/vpn/services` through the loader, so a
 * plan repriced in admin changes the page and its structured data with no
 * deploy. Two states, as on the other landing pages:
 *
 * - **catalog answered** — prices, device limits and exit regions are the
 *   catalog's, and each plan gets `Product`/`Offer` markup.
 * - **no catalog** (the current state on production, and any cold start with
 *   the API unreachable) — the prose still renders and no price is stated
 *   anywhere, rather than a number written into the front end.
 */
export function VpnPage() {
  const intl = useIntl();
  const { formatMessage } = intl;
  const { vpn } = useLoaderData<VpnLoaderData>();

  const services = vpn ?? [];
  // Ex-VAT and unconverted, matching the `Offer`s and what a crawler is served.
  const price = vpnPriceFrom(services);
  const priceText = price ? formatPriceText(intl, price) : undefined;
  // The cheapest plan's own period, so a yearly plan is never described as
  // monthly by a "/month" written into the sentence.
  const periodText = price
    ? formatIntervalText(intl, price.interval_type, price.interval_amount)
    : undefined;
  const priceNode = price ? (
    <CostAmount cost={price} converted={false} />
  ) : null;
  const regions = vpnRegions(services);
  // The largest allowance on offer: "up to N devices" has to be true of some
  // plan, and the table below says which.
  const maxDevices = services.reduce((n, s) => Math.max(n, s.device_limit), 0);

  // Rendered as the FAQ block *and* handed to `faqJsonLd`, so the markup a
  // crawler reads and the text a visitor reads cannot drift.
  const faq: FaqItem[] = [
    {
      question: formatMessage({ defaultMessage: "Who generates the keys?" }),
      answer: formatMessage({
        defaultMessage:
          "You do. Your device makes the WireGuard keypair and sends us only the public half, so the key that decrypts your traffic is never ours to hand over or to lose.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do you keep logs?" }),
      answer: formatMessage({
        defaultMessage:
          "No traffic or connection logs are written. A route server holds the public keys it carries and the internal address each one has, and WireGuard keeps a last handshake time and your current endpoint in memory, which is what the protocol needs to route a packet back to you.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "What do I need to connect?" }),
      answer: formatMessage({
        defaultMessage:
          "The official WireGuard client, on any platform it supports. We give you a ready-to-use config file per region, or a QR code to scan on a phone.",
      }),
    },
    {
      question: formatMessage({
        defaultMessage: "Do I have to pick a region when I buy?",
      }),
      answer: formatMessage({
        defaultMessage:
          "No. A device holds one keypair and one address that work in every region, so switching exit is a different config file, not a different plan or a new key.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Do you need my email?" }),
      answer: formatMessage({
        defaultMessage:
          "Not if you sign in with a Nostr key: no email, no name, no KYC. Signing in with Google or a passkey uses whatever that account gives us, and paying by card means the card processor sees your billing details.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "How do I pay?" }),
      answer: formatMessage({
        defaultMessage:
          "Lightning, on-chain Bitcoin, or card. We run our own Lightning node, so sats do not route through a third-party processor.",
      }),
    },
    {
      question: formatMessage({
        defaultMessage: "What happens if I stop paying?",
      }),
      answer: formatMessage({
        defaultMessage:
          "The plan lapses and its devices stop connecting. Your keys and addresses are held until you remove the devices, so renewing brings the same tunnels back.",
      }),
    },
  ];

  return (
    <>
      <Seo
        title={
          priceText
            ? formatMessage(
                { defaultMessage: "WireGuard VPN from {price} per {period}" },
                { price: priceText, period: periodText },
              )
            : formatMessage({ defaultMessage: "WireGuard VPN, paid in sats" })
        }
        canonical="/vpn"
        description={
          priceText
            ? formatMessage(
                {
                  defaultMessage:
                    "A WireGuard VPN from {price} per {period}, paid with Lightning, Bitcoin or card. Your device makes its own keys and we only ever see the public half.",
                },
                { price: priceText, period: periodText },
              )
            : formatMessage({
                defaultMessage:
                  "A WireGuard VPN paid with Lightning, Bitcoin or card. Your device makes its own keys and we only ever see the public half.",
              })
        }
        jsonLd={[...services.map((s) => vpnServiceJsonLd(s)), faqJsonLd(faq)]}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            {priceNode ? (
              <FormattedMessage
                defaultMessage="WireGuard VPN from {price}"
                values={{ price: priceNode }}
              />
            ) : (
              <FormattedMessage defaultMessage="WireGuard VPN, paid in sats" />
            )}
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Tunnels on the same infrastructure as our VPS fleet: our own hardware and AS214973 address space where we have it, leased capacity where we do not. Your device generates the keypair and hands over only the public half, so the key your traffic is encrypted with never exists on our side." />
          </p>
        </header>

        <Section title={<FormattedMessage defaultMessage="How it works" />}>
          <ol className="m-0 flex max-w-prose list-decimal flex-col gap-1 pl-5 text-cyber-text">
            <li>
              <FormattedMessage defaultMessage="Buy a plan and pay its subscription with Lightning, Bitcoin or card." />
            </li>
            <li>
              <FormattedMessage defaultMessage="Register each device by its WireGuard public key. Generate it with the WireGuard app or wg genkey, or let the browser make one for you." />
            </li>
            <li>
              <FormattedMessage defaultMessage="Download a config, or scan its QR code, and bring the tunnel up. One file per exit region, all sharing the same key." />
            </li>
          </ol>
        </Section>

        {services.length > 0 && (
          <Section title={<FormattedMessage defaultMessage="Plans" />}>
            <div className="max-w-3xl overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-cyber-border text-xs uppercase tracking-[0.15em] text-cyber-muted">
                    <th className="py-2 pr-4 font-normal">
                      <FormattedMessage defaultMessage="Plan" />
                    </th>
                    <th className="py-2 pr-4 font-normal">
                      <FormattedMessage defaultMessage="Devices" />
                    </th>
                    <th className="py-2 pr-4 font-normal">
                      <FormattedMessage defaultMessage="Addresses" />
                    </th>
                    <th className="py-2 font-normal">
                      <FormattedMessage defaultMessage="Price" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/60">
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap py-2 pr-4 font-bold text-cyber-text-bright">
                        {s.name}
                      </td>
                      <td className="py-2 pr-4 text-cyber-text tabular-nums">
                        {s.device_limit}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-cyber-text">
                        {s.ipv4 && s.ipv6
                          ? "IPv4 + IPv6"
                          : s.ipv6
                            ? "IPv6"
                            : "IPv4"}
                      </td>
                      <td className="whitespace-nowrap py-2 text-cyber-text">
                        <CostAmount
                          cost={{
                            currency: s.currency,
                            amount: s.amount,
                            interval_type: s.interval_type,
                            interval_amount: s.interval_amount,
                          }}
                          converted={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {maxDevices > 0 && (
              <p className="m-0 max-w-prose text-cyber-text">
                <FormattedMessage
                  defaultMessage="A device is one registered public key: your phone, your laptop, your router. Up to {count, plural, one {# device} other {# devices}} on one plan, and a device you remove frees its slot."
                  values={{ count: maxDevices }}
                />
              </p>
            )}
          </Section>
        )}

        {regions.length > 0 && (
          <Section title={<FormattedMessage defaultMessage="Exit regions" />}>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-cyber-text-bright">
              {regions.map((r) => (
                <RegionName
                  key={r.region_id}
                  region={{ name: r.name, country_code: r.country_code }}
                />
              ))}
            </div>
            <p className="m-0 max-w-prose text-cyber-text">
              <FormattedMessage defaultMessage="Every device reaches every region. The address inside the tunnel is the same wherever you exit, so switching country is a config file, not a re-registration." />
            </p>
          </Section>
        )}

        <Section
          title={
            <FormattedMessage defaultMessage="What we hold, and what we do not" />
          }
        >
          {/* Every line here is a statement about the running system, not a
              promise: the key handling is what the API enforces, and the
              logging line says what the route servers keep rather than making
              a policy claim that nothing verifies. */}
          <ul className="m-0 flex max-w-prose list-disc flex-col gap-1 pl-5 text-cyber-text">
            <li>
              <FormattedMessage defaultMessage="We hold your public key and the internal address assigned to it. That pair is what a WireGuard peer is, and it is all a route server needs to carry you." />
            </li>
            <li>
              <FormattedMessage defaultMessage="No traffic or connection logs are written. WireGuard itself keeps a last handshake time and the endpoint you are currently dialling from, in memory, because the protocol cannot route a packet back without them." />
            </li>
            <li>
              <FormattedMessage defaultMessage="The private key that decrypts your traffic is generated on your device and never sent to us, so it is not ours to lose, to leak, or to be compelled to produce." />
            </li>
            <li>
              <FormattedMessage defaultMessage="Nothing is configured on a route server until the plan is paid for, and removing a device revokes its key on every server the service terminates on." />
            </li>
            <li>
              <FormattedMessage defaultMessage="Sign in with a Nostr key and there is no email or name on the account at all. Pay with Lightning or on-chain Bitcoin and there is no card statement either." />
            </li>
          </ul>
        </Section>

        <Section
          title={
            <FormattedMessage defaultMessage="When you want a whole machine instead" />
          }
        >
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage
              defaultMessage="A VPN plan gives you an exit, not a server. If you want a box to run your own services on, with a static IPv4 and IPv6 and unmetered traffic, our <a>VPS hosting</a> runs on the same fleet."
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
            to="/account/vpn"
            className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            {priceNode ? (
              <FormattedMessage
                defaultMessage="Get a tunnel from {price}"
                values={{ price: priceNode }}
              />
            ) : (
              <FormattedMessage defaultMessage="Get a tunnel" />
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
