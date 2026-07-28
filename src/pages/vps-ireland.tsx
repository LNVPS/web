import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { CostAmount } from "../components/cost";
import BytesSize from "../components/bytes";
import { Section } from "../components/landing";
import { RegionLanding } from "../components/region-landing";
import { formatPriceText } from "../utils/currency";
import { catalogPriceFrom } from "../utils/relay-catalog";
import { regionCustomTemplate } from "../utils/regions";
import { DublinRegionId } from "../const";
import type { RegionLoaderData } from "../loaders";

/**
 * `/vps-ireland` — region landing page for Dublin (`LNVPS/web#22`).
 *
 * Dublin is the deepest site and the only one with a managed-app presence, so
 * it is the one region page that cross-sells the apps. That price is the
 * catalog's, through the same helper the two app landing pages use, so the
 * three cannot quote different money.
 *
 * Every figure in the copy — the ranges in the lede, the CPU ceiling in the
 * meta description, the entry price — is a placeholder filled from the
 * catalog. When the API gives us nothing, each sentence has a second form
 * without the figure rather than a number written into the front end.
 */
export function VpsIrelandPage() {
  const intl = useIntl();
  const { offers, from, apps } = useLoaderData<RegionLoaderData>();
  const template = regionCustomTemplate(offers, DublinRegionId);
  const fromText = from ? formatPriceText(intl, from) : undefined;
  // "From" across the whole catalog, since the sentence names the relays and
  // the Blossom servers together. Undefined when the catalog is unreachable,
  // and the sentence then drops the figure.
  const appPrice = catalogPriceFrom(apps ?? []);

  const appLinks = {
    relay: (chunks: ReactNode) => (
      <Link
        to="/nostr-relay-hosting"
        className="text-cyber-primary hover:underline"
      >
        {chunks}
      </Link>
    ),
    blossom: (chunks: ReactNode) => (
      <Link
        to="/blossom-server-hosting"
        className="text-cyber-primary hover:underline"
      >
        {chunks}
      </Link>
    ),
  };

  const description =
    fromText && template
      ? intl.formatMessage(
          {
            defaultMessage:
              "VPS hosting in Dublin, Ireland from {price}/month ex-VAT. Build your own spec up to {maxCpu} vCPU. Pay in Bitcoin over Lightning or on-chain.",
          },
          { price: fromText, maxCpu: template.max_cpu },
        )
      : intl.formatMessage({
          defaultMessage:
            "VPS hosting in Dublin, Ireland. Build your own spec — CPU, memory and storage to order. Pay in Bitcoin over Lightning or on-chain.",
        });

  return (
    <RegionLanding
      path="/vps-ireland"
      regionId={DublinRegionId}
      title={intl.formatMessage({
        defaultMessage: "VPS Ireland — Dublin VPS Paid in Bitcoin",
      })}
      description={description}
      h1={<FormattedMessage defaultMessage="VPS hosting in Ireland" />}
      lede={
        template ? (
          <FormattedMessage
            defaultMessage="Our Dublin site. Build the machine you want between {minCpu}–{maxCpu} vCPU and {minMemory}–{maxMemory}, and pay for it in Bitcoin."
            values={{
              minCpu: template.min_cpu,
              maxCpu: template.max_cpu,
              minMemory: <BytesSize value={template.min_memory} />,
              maxMemory: <BytesSize value={template.max_memory} />,
            }}
          />
        ) : (
          <FormattedMessage defaultMessage="Our Dublin site. Build the machine you want, and pay for it in Bitcoin." />
        )
      }
      cta={<FormattedMessage defaultMessage="Build your Dublin VPS" />}
    >
      <Section title={<FormattedMessage defaultMessage="Also in Dublin" />}>
        <p className="m-0 max-w-prose text-cyber-text">
          {appPrice ? (
            <FormattedMessage
              defaultMessage="Dublin is also where our managed <relay>Nostr relays</relay> and <blossom>Blossom servers</blossom> run, from {price} a month."
              values={{
                ...appLinks,
                price: <CostAmount cost={appPrice} converted={false} />,
              }}
            />
          ) : (
            <FormattedMessage
              defaultMessage="Dublin is also where our managed <relay>Nostr relays</relay> and <blossom>Blossom servers</blossom> run."
              values={appLinks}
            />
          )}
        </p>
      </Section>
    </RegionLanding>
  );
}
