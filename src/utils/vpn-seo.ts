import type { VpnRegion, VpnService } from "../api";
import { BILLING_UNIT, SITE_URL, standardUnitPrice } from "./schema-org";

/** A recurring price, in the shape `CostAmount` and the JSON-LD helpers take. */
export interface VpnPrice {
  currency: string;
  amount: number;
  interval_type: VpnService["interval_type"];
  interval_amount: number;
}

/**
 * The cheapest plan on offer, for the page's "from {price}" wording.
 *
 * Only plans priced in the same currency are compared, because the catalog
 * quotes one amount per service with no rate to convert between them: picking
 * the smaller of 5 EUR and 600 JPY by number alone would quote a price that is
 * not the cheapest. The currency of the first service wins, since that is the
 * one the rest of the page is already quoting.
 *
 * Undefined when the catalog returned nothing, which is a state the page has to
 * render: a price the front end cannot read is never written into it.
 */
export function vpnPriceFrom(
  services?: Array<VpnService>,
): VpnPrice | undefined {
  const first = services?.[0];
  if (!first) return undefined;
  const comparable = services!.filter((s) => s.currency === first.currency);
  const cheapest = comparable.reduce((a, b) => (b.amount < a.amount ? b : a));
  return {
    currency: cheapest.currency,
    amount: cheapest.amount,
    interval_type: cheapest.interval_type,
    interval_amount: cheapest.interval_amount,
  };
}

/**
 * Every exit region the catalog offers, deduplicated across plans and sorted by
 * name.
 *
 * A region is a property of the service's pools, so two plans exiting the same
 * place list it twice; the page is answering "where can I exit?", which is one
 * list regardless of how many plans reach it.
 */
export function vpnRegions(services?: Array<VpnService>): Array<VpnRegion> {
  const byId = new Map<number, VpnRegion>();
  for (const s of services ?? []) {
    for (const r of s.regions) {
      if (!byId.has(r.region_id)) byId.set(r.region_id, r);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * `Product`/`Offer` structured data for one VPN plan.
 *
 * Every value is the service's own, so a plan repriced in admin changes the
 * markup with no deploy here, and a plan the catalog did not return has no
 * markup at all. Ex-VAT, like every other price the site shows logged out: tax
 * is applied at payment against the buyer's country and cannot be in a figure
 * a crawler caches.
 */
export function vpnServiceJsonLd(service: VpnService): object {
  const url = `${SITE_URL}/vpn`;
  const offerPrice = standardUnitPrice(service.amount, service.currency);
  const regions = service.regions.map((r) => r.name).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.name,
    description: regions
      ? `WireGuard VPN for up to ${service.device_limit} devices, exiting in ${regions}.`
      : `WireGuard VPN for up to ${service.device_limit} devices.`,
    url,
    brand: { "@type": "Brand", name: "LNVPS" },
    ...(offerPrice
      ? {
          offers: {
            "@type": "Offer",
            url,
            availability: "https://schema.org/InStock",
            price: offerPrice,
            priceCurrency: service.currency,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: offerPrice,
              priceCurrency: service.currency,
              valueAddedTaxIncluded: false,
              billingDuration: service.interval_amount,
              billingIncrement: 1,
              unitCode: BILLING_UNIT[service.interval_type].code,
              unitText: BILLING_UNIT[service.interval_type].text,
            },
          },
        }
      : {}),
  };
}
