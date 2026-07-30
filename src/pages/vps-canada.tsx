import { useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { RegionLanding } from "../components/region-landing";
import { formatBytesText } from "../utils/bytes";
import { formatPriceWithInterval } from "../utils/currency";
import { regionCustomTemplate, regionMaxDisk } from "../utils/regions";
import { QuebecRegionId } from "../const";
import type { RegionLoaderData } from "../loaders";

/**
 * `/vps-canada` — region landing page for Quebec (`LNVPS/web#22`).
 *
 * Like London, Quebec has no standard plan in the catalog: the custom
 * builder's ranges and an entry price are what this page has and what it
 * claims.
 */
export function VpsCanadaPage() {
  const intl = useIntl();
  const { offers, from } = useLoaderData<RegionLoaderData>();
  const template = regionCustomTemplate(offers, QuebecRegionId);
  const disk = regionMaxDisk(template);
  const fromText = from ? formatPriceWithInterval(intl, from) : undefined;

  const description =
    fromText && template && disk
      ? intl.formatMessage(
          {
            defaultMessage:
              "VPS hosting in Quebec, Canada from {price} ex-VAT. {minCpu}–{maxCpu} vCPU, up to {maxDisk} {diskType}. Pay in Bitcoin over Lightning or on-chain.",
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
            "VPS hosting in Quebec, Canada. Pick your CPU, memory and disk. Pay in Bitcoin over Lightning or on-chain.",
        });

  return (
    <RegionLanding
      path="/vps-canada"
      regionId={QuebecRegionId}
      title={intl.formatMessage({
        defaultMessage: "VPS Canada — Quebec VPS Paid in Bitcoin",
      })}
      description={description}
      h1={<FormattedMessage defaultMessage="VPS hosting in Canada" />}
      lede={
        <FormattedMessage defaultMessage="Our Quebec site, for when you want the machine outside Europe. Same build-it-yourself specs, same monthly billing, paid in Bitcoin." />
      }
      cta={<FormattedMessage defaultMessage="Build your Quebec VPS" />}
    />
  );
}
