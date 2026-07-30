import type { IntlShape } from "react-intl";
import { CostPlanIntervalType, type VmCustomPrice, type VmTemplate } from "../api";
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
/**
 * `Product`/`Offer` structured data for the smallest machine a region can
 * build, at the price `POST /api/v1/vm/custom-template/price` quotes for it
 * (`LNVPS/web#22`).
 *
 * The region pages sell the custom builder, not a plan: London and Quebec have
 * no standard plan at all, so `vpsTemplateJsonLd` has nothing to describe
 * there. Name, description and price come from the caller's catalog row and
 * the price endpoint; a region with no price gets no markup rather than a
 * remembered figure.
 *
 * The billing period comes off the price response itself
 * (`interval_amount`/`interval_type`), the same fields `vpsTemplateJsonLd`
 * reads off a standard plan's `cost_plan` below. Falls back to a monthly
 * default when they're absent, so this degrades instead of throwing against
 * an API that hasn't shipped them yet.
 *
 * Ex-VAT, like every other price on the site logged out: tax is applied at
 * payment against the buyer's country, so it cannot be in a crawled figure.
 */
export function regionOfferJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  regionName: string;
  price: VmCustomPrice;
}): object | undefined {
  const offerPrice = standardUnitPrice(opts.price.amount, opts.price.currency);
  if (!offerPrice) return undefined;
  const url = `${SITE_URL}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    url,
    brand: { "@type": "Brand", name: "LNVPS" },
    offers: {
      "@type": "Offer",
      url,
      availability: "https://schema.org/InStock",
      price: offerPrice,
      priceCurrency: opts.price.currency,
      areaServed: { "@type": "Place", name: opts.regionName },
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: offerPrice,
        priceCurrency: opts.price.currency,
        valueAddedTaxIncluded: false,
        billingDuration: opts.price.interval_amount ?? 1,
        billingIncrement: 1,
        unitCode: BILLING_UNIT[opts.price.interval_type ?? CostPlanIntervalType.MONTH].code,
        unitText: BILLING_UNIT[opts.price.interval_type ?? CostPlanIntervalType.MONTH].text,
      },
    },
  };
}

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
