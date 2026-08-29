import type { SubscriptionLineItemResource } from "../api";

/**
 * What a line item's linked resource is, flattened for display.
 *
 * `kind` is the resource type, `id` the number to show beside it, and `to` the
 * page it links to when the product has one.
 */
export interface ResourceRef {
  kind: SubscriptionLineItemResource["type"];
  /** Absent for a product where one account holds a single instance. */
  id?: number;
  to?: string;
}

/**
 * Resolve a line item's resource to the badge a subscription page shows.
 *
 * Exhaustive by type, with `undefined` for anything this build does not know.
 * The badge used to end in an `else` that printed "IP range #{id}", so every
 * resource type added to the API after it was written (a VPN plan, a
 * marketplace node listing) was labelled as somebody else's product, reading
 * off an id field that was not even in the object.
 */
export function subscriptionResource(
  resource?: SubscriptionLineItemResource | null,
): ResourceRef | undefined {
  if (!resource) return undefined;
  switch (resource.type) {
    case "vps":
      return { kind: "vps", id: resource.vm_id };
    case "app":
      return {
        kind: "app",
        id: resource.app_deployment_id,
        to: `/account/apps/deployments/${resource.app_deployment_id}`,
      };
    case "vpn":
      // One plan per account, so its id is not worth showing.
      return { kind: "vpn", to: "/account/vpn" };
    case "asn":
      return { kind: "asn", id: resource.asn_subscription_id };
    case "ip_range":
      return { kind: "ip_range", id: resource.ip_range_subscription_id };
    case "marketplace_node":
      return { kind: "marketplace_node", id: resource.marketplace_node_id };
    default:
      return undefined;
  }
}
