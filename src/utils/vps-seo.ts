import type { IntlShape } from "react-intl";
import type { VmTemplate } from "../api";
import { formatBytesText } from "./bytes";
import { BILLING_UNIT, SITE_URL, standardUnitPrice } from "./schema-org";

/**
 * `Product`/`Offer` structured data for one standard VPS plan (`LNVPS/web#20`).
 *
 * Every value is the template's own: name, specs, price, currency, billing
 * period and region all come off `GET /api/v1/vm/templates`, so a plan added
 * or repriced in admin changes the markup with no deploy here. A plan the
 * catalog did not return has no markup at all, which is the point — a stale
 * price in structured data outlives the page it was scraped from.
 *
 * `InStock` is derived, not assumed: the endpoint only returns templates a
 * host in their region can currently accommodate
 * (`lnvps_api_common/src/capacity.rs:58-65`), so being in this list *is* the
 * availability signal.
 *
 * The plans have no page of their own — they are ordered from the homepage —
 * so both URLs point there.
 */
export function vpsTemplateJsonLd(t: VmTemplate, intl: IntlShape): object {
  const offerPrice = standardUnitPrice(t.cost_plan.amount, t.cost_plan.currency);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: t.name,
    description: intl.formatMessage(
      {
        defaultMessage:
          "{cpu} vCPU, {memory} RAM, {disk} {diskType} storage in {region}.",
      },
      {
        cpu: t.cpu,
        memory: formatBytesText(intl, t.memory),
        disk: formatBytesText(intl, t.disk_size),
        diskType: t.disk_type.toUpperCase(),
        region: t.region.name,
      },
    ),
    url: SITE_URL,
    brand: { "@type": "Brand", name: "LNVPS" },
    ...(offerPrice
      ? {
          offers: {
            "@type": "Offer",
            url: SITE_URL,
            availability: "https://schema.org/InStock",
            price: offerPrice,
            priceCurrency: t.cost_plan.currency,
            areaServed: { "@type": "Place", name: t.region.name },
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: offerPrice,
              priceCurrency: t.cost_plan.currency,
              // Ex-VAT, matching what the page shows logged out. Never
              // conditional on the VAT toggle: this is what a crawler sees.
              valueAddedTaxIncluded: false,
              billingDuration: t.cost_plan.interval_amount,
              billingIncrement: 1,
              unitCode: BILLING_UNIT[t.cost_plan.interval_type].code,
              unitText: BILLING_UNIT[t.cost_plan.interval_type].text,
            },
          },
        }
      : {}),
  };
}
