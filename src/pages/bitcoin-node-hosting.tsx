import { useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import BytesSize from "../components/bytes";
import { OrderCta, RegionSpecs, Section } from "../components/landing";
import { DiskType } from "../api";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { formatBytesText } from "../utils/bytes";
import { formatPriceWithInterval } from "../utils/currency";
import {
  regionCustomTemplate,
  regionDisk,
  regionMaxDisk,
} from "../utils/regions";
import { DublinRegionId } from "../const";
import type { RegionLoaderData } from "../loaders";

/**
 * `/bitcoin-node-hosting` — use-case landing page for running a Bitcoin full
 * node on a VPS (`LNVPS/web#22`).
 *
 * **This is a VPS page, not a Managed App page.** There is no Bitcoin node in
 * the app catalog, so the page must not imply a one-click install: it links to
 * the VPS order flow, and the FAQ says in as many words that you install the
 * node yourself.
 *
 * The figures are Dublin's, because Dublin is the region with room for the
 * chain, and they come off its catalog row rather than being written here — a
 * disk ceiling quoted from memory is the thing this page would most obviously
 * get wrong. The regions it names are the regions the catalog returns a custom
 * template for, in catalog order.
 */
export function BitcoinNodeHostingPage() {
  const intl = useIntl();
  const { formatMessage } = intl;
  const { offers, from } = useLoaderData<RegionLoaderData>();

  const dublin = regionCustomTemplate(offers, DublinRegionId);
  const hdd = regionDisk(dublin, DiskType.HDD);
  const ssd = regionDisk(dublin, DiskType.SSD);
  const maxDisk = regionMaxDisk(dublin);
  const fromText = from ? formatPriceWithInterval(intl, from) : undefined;

  // The regions we actually offer a build in, named as the catalog names them
  // and sorted, since the endpoint's order is not stable and a sentence should
  // not reshuffle between requests.
  const regions = (offers?.custom_template ?? [])
    .map((t) => t.region.name)
    .sort((a, b) => a.localeCompare(b));
  const regionList =
    regions.length > 0
      ? intl.formatList(regions, { type: "disjunction" })
      : undefined;

  const description =
    regionList && fromText
      ? formatMessage(
          {
            defaultMessage:
              "Run a Bitcoin full node on a VPS in {regions}. Pay in Bitcoin over Lightning or on-chain. From {price} ex-VAT.",
          },
          { regions: regionList, price: fromText },
        )
      : formatMessage({
          defaultMessage:
            "Run a Bitcoin full node on a VPS with room for the chain. Pay in Bitcoin over Lightning or on-chain.",
        });

  // Rendered as the FAQ block *and* handed to `faqJsonLd`, so the markup a
  // crawler reads and the text a visitor reads cannot drift.
  const faq: FaqItem[] = [
    {
      question: formatMessage({
        defaultMessage: "Do you install Bitcoin Core for me?",
      }),
      answer: formatMessage({
        defaultMessage:
          "No. This is a plain VPS with root access; you install and run the node. Our one-click managed apps are Nostr relays and Blossom media servers, and those are Dublin only.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Can I pay in Bitcoin?" }),
      answer: formatMessage({
        defaultMessage: "Yes, Lightning or on-chain. Renewal is monthly.",
      }),
    },
  ];

  return (
    <>
      <Seo
        title={formatMessage({ defaultMessage: "Bitcoin Node Hosting" })}
        canonical="/bitcoin-node-hosting"
        description={description}
        jsonLd={faqJsonLd(faq)}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            <FormattedMessage defaultMessage="Bitcoin node hosting" />
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="A VPS with room for the chain, paid for in Bitcoin. You choose the specs and install your own node software, with root access and no control panel in the way." />
          </p>
        </header>

        {dublin && (
          <Section
            title={<FormattedMessage defaultMessage="Room for the chain" />}
          >
            {hdd && ssd ? (
              <p className="m-0 max-w-prose text-cyber-text">
                <FormattedMessage
                  defaultMessage="In {region}, disk goes up to {hdd} HDD or {ssd} SSD, with {cpu} vCPU and {memory} at the top end."
                  values={{
                    region: dublin.region.name,
                    hdd: <BytesSize value={hdd.max_disk} />,
                    ssd: <BytesSize value={ssd.max_disk} />,
                    cpu: dublin.max_cpu,
                    memory: <BytesSize value={dublin.max_memory} />,
                  }}
                />
              </p>
            ) : maxDisk ? (
              <p className="m-0 max-w-prose text-cyber-text">
                <FormattedMessage
                  defaultMessage="In {region}, disk goes up to {disk}, with {cpu} vCPU and {memory} at the top end."
                  values={{
                    region: dublin.region.name,
                    disk: formatBytesText(intl, maxDisk.max_disk),
                    cpu: dublin.max_cpu,
                    memory: <BytesSize value={dublin.max_memory} />,
                  }}
                />
              </p>
            ) : null}
            <RegionSpecs template={dublin} />
            {from && (
              <p className="m-0 max-w-prose text-cyber-text">
                <FormattedMessage
                  defaultMessage="From {price}, excluding VAT."
                  values={{
                    price: <CostAmount cost={from} converted={false} />,
                  }}
                />
              </p>
            )}
          </Section>
        )}

        {regionList && (
          <Section title={<FormattedMessage defaultMessage="Where" />}>
            <p className="m-0 max-w-prose text-cyber-text">
              <FormattedMessage
                defaultMessage="Build it in {regions}."
                values={{ regions: regionList }}
              />
            </p>
          </Section>
        )}

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

        <OrderCta>
          <FormattedMessage defaultMessage="Build your node's VPS" />
        </OrderCta>
      </div>
    </>
  );
}
