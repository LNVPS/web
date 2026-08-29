import { describe, expect, test } from "bun:test";
import type { SubscriptionLineItemResource } from "../api";
import { subscriptionResource } from "./subscription-resource";

describe("subscriptionResource", () => {
  // The bug: the badge ended in an `else` that assumed IP range, so a VPN line
  // item on the subscriptions page was labelled "IP RANGE" and read an id
  // field the object does not have.
  test("a VPN plan is a VPN, not an IP range", () => {
    expect(
      subscriptionResource({ type: "vpn", vpn_subscription_id: 4 }),
    ).toEqual({ kind: "vpn", to: "/account/vpn" });
  });

  test("a marketplace listing is not an IP range either", () => {
    expect(
      subscriptionResource({
        type: "marketplace_node",
        marketplace_node_id: 9,
      }),
    ).toEqual({ kind: "marketplace_node", id: 9 });
  });

  test("each known resource keeps its own id field", () => {
    expect(subscriptionResource({ type: "vps", vm_id: 12 })).toEqual({
      kind: "vps",
      id: 12,
    });
    expect(
      subscriptionResource({ type: "asn", asn_subscription_id: 3 }),
    ).toEqual({ kind: "asn", id: 3 });
    expect(
      subscriptionResource({ type: "ip_range", ip_range_subscription_id: 7 }),
    ).toEqual({ kind: "ip_range", id: 7 });
  });

  test("an app links to its deployment", () => {
    expect(subscriptionResource({ type: "app", app_deployment_id: 5 })).toEqual(
      {
        kind: "app",
        id: 5,
        to: "/account/apps/deployments/5",
      },
    );
  });

  test("a line item with no linked resource has no badge", () => {
    expect(subscriptionResource(undefined)).toBeUndefined();
    expect(subscriptionResource(null)).toBeUndefined();
  });

  test("a type this build has not heard of gets no badge, not a wrong one", () => {
    // What the server sends after the next product ships.
    const future = {
      type: "quantum_link",
      quantum_link_id: 1,
    } as unknown as SubscriptionLineItemResource;
    expect(subscriptionResource(future)).toBeUndefined();
  });
});
