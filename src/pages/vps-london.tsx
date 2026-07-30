import { useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { RegionLanding } from "../components/region-landing";
import { formatBytesText } from "../utils/bytes";
import { formatPriceWithInterval } from "../utils/currency";
import { regionCustomTemplate, regionMaxDisk } from "../utils/regions";
import { LondonRegionId } from "../const";
import type { RegionLoaderData } from "../loaders";

/**
 * `/vps-london` — region landing page for London (`LNVPS/web#22`).
 *
 * London has no standard plan in the catalog, so there is no plan card here
 * and no `Product` markup for one: the page sells the custom builder, and its
 * ranges and entry price are the region's own catalog row.
 */
export function VpsLondonPage() {
  const intl = useIntl();
  const { offers, from } = useLoaderData<RegionLoaderData>();
  const template = regionCustomTemplate(offers, LondonRegionId);
  const disk = regionMaxDisk(template);
  const fromText = from ? formatPriceWithInterval(intl, from) : undefined;

  const description =
    fromText && template && disk
      ? intl.formatMessage(
          {
            defaultMessage:
              "VPS hosting in London from {price} ex-VAT. {minCpu}–{maxCpu} vCPU, up to {maxDisk} {diskType}. Pay in Bitcoin over Lightning or on-chain.",
          },
          {
            price: fromText,
            minCpu: template.min_cpu,
            maxCpu: template.max_cpu,
            maxDisk: formatBytesText(intl, disk.max_disk),
            diskType: disk.disk_type.toUpperCase(),
          },
        )
      : intl.formatMessage({
          defaultMessage:
            "VPS hosting in London. Pick your CPU, memory and disk. Pay in Bitcoin over Lightning or on-chain.",
        });

  return (
    <RegionLanding
      path="/vps-london"
      regionId={LondonRegionId}
      title={intl.formatMessage({
        defaultMessage: "VPS London — UK VPS Paid in Bitcoin",
      })}
      description={description}
      h1={<FormattedMessage defaultMessage="VPS hosting in London" />}
      lede={
        <FormattedMessage defaultMessage="A UK machine, billed monthly and paid in Bitcoin. Pick your CPU, memory and disk; nothing is bundled that you did not ask for." />
      }
      cta={<FormattedMessage defaultMessage="Build your London VPS" />}
    />
  );
}
