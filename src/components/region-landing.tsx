import { ReactNode } from "react";
import { useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "./seo";
import { CostAmount } from "./cost";
import { OrderCta, RegionSpecs, Section } from "./landing";
import { formatBytesText } from "../utils/bytes";
import { regionCustomTemplate } from "../utils/regions";
import { regionOfferJsonLd } from "../utils/vps-seo";
import type { RegionLoaderData } from "../loaders";

/**
 * The shared body of a region landing page (`LNVPS/web#22`).
 *
 * The three region pages differ only in their copy, which each page writes for
 * itself so `formatjs extract` can see it. Everything factual is here and is
 * the same code for every region: the spec list, the "from" price and the
 * `Offer` markup all read the region's catalog row.
 *
 * London and Quebec have no standard plan, so there is no plan card to show
 * and no `vpsTemplateJsonLd` to emit — the builder's ranges and an entry price
 * are what these pages have, which is also what they claim.
 *
 * Both price-carrying elements are branched on the catalog answering: with no
 * price the page keeps its prose and simply does not quote a figure, rather
 * than falling back to one written into the front end (`LNVPS/web#67`).
 */
export function RegionLanding({
  path,
  regionId,
  title,
  description,
  h1,
  lede,
  cta,
  children,
}: {
  path: string;
  regionId: number;
  /** Page title, without the site suffix `Seo` appends. */
  title: string;
  /** Meta description; the page decides whether it quotes the entry price. */
  description: string;
  h1: ReactNode;
  lede: ReactNode;
  cta: ReactNode;
  /** Extra sections, rendered above the FAQ-less footer of the page. */
  children?: ReactNode;
}) {
  const intl = useIntl();
  const { offers, from } = useLoaderData<RegionLoaderData>();
  const template = regionCustomTemplate(offers, regionId);

  const jsonLd =
    template && from
      ? regionOfferJsonLd({
          name: intl.formatMessage(
            { defaultMessage: "VPS in {region}" },
            { region: template.region.name },
          ),
          description: intl.formatMessage(
            {
              defaultMessage:
                "A VPS built to order in {region}: {minCpu}–{maxCpu} vCPU and {minMemory}–{maxMemory} memory, paid in Bitcoin.",
            },
            {
              region: template.region.name,
              minCpu: template.min_cpu,
              maxCpu: template.max_cpu,
              minMemory: formatBytesText(intl, template.min_memory),
              maxMemory: formatBytesText(intl, template.max_memory),
            },
          ),
          path,
          regionName: template.region.name,
          price: from,
        })
      : undefined;

  return (
    <>
      <Seo
        title={title}
        canonical={path}
        description={description}
        jsonLd={jsonLd}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">{h1}</h1>
          <p className="m-0 max-w-prose text-cyber-text">{lede}</p>
        </header>

        {template && (
          <Section title={<FormattedMessage defaultMessage="What you can build" />}>
            <RegionSpecs template={template} />
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

        {children}

        <OrderCta>{cta}</OrderCta>
      </div>
    </>
  );
}
