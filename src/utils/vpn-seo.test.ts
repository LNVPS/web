import { describe, expect, test } from "bun:test";
import { CostPlanIntervalType, type VpnService } from "../api";
import { vpnPriceFrom, vpnRegions, vpnServiceJsonLd } from "./vpn-seo";

function service(over: Partial<VpnService> = {}): VpnService {
  return {
    id: 1,
    name: "Monthly",
    amount: 500,
    setup_amount: 0,
    currency: "EUR",
    interval_amount: 1,
    interval_type: CostPlanIntervalType.MONTH,
    device_limit: 5,
    ipv4: true,
    ipv6: true,
    regions: [{ region_id: 1, name: "Dublin", country_code: "IE" }],
    ...over,
  };
}

describe("vpnPriceFrom", () => {
  test("quotes the cheapest plan", () => {
    const price = vpnPriceFrom([
      service({ id: 1, amount: 500 }),
      service({ id: 2, amount: 300 }),
    ]);
    expect(price).toEqual({
      currency: "EUR",
      amount: 300,
      interval_type: CostPlanIntervalType.MONTH,
      interval_amount: 1,
    });
  });

  test("carries the cheapest plan's own billing period", () => {
    const yearly = vpnPriceFrom([
      service({ id: 1, amount: 500 }),
      service({
        id: 2,
        amount: 400,
        interval_type: CostPlanIntervalType.YEAR,
        interval_amount: 1,
      }),
    ]);
    // "from 4.00" must not then be described as monthly.
    expect(yearly?.interval_type).toBe(CostPlanIntervalType.YEAR);
  });

  test("never compares across currencies", () => {
    // 600 JPY is far less money than 5 EUR; picking by number alone would
    // quote a "cheapest" price that is not the cheapest.
    const price = vpnPriceFrom([
      service({ id: 1, amount: 500, currency: "EUR" }),
      service({ id: 2, amount: 300, currency: "JPY" }),
    ]);
    expect(price?.currency).toBe("EUR");
    expect(price?.amount).toBe(500);
  });

  test("no catalog means no price to write down", () => {
    expect(vpnPriceFrom(undefined)).toBeUndefined();
    expect(vpnPriceFrom([])).toBeUndefined();
  });
});

describe("vpnRegions", () => {
  test("one entry per region, however many plans reach it", () => {
    const regions = vpnRegions([
      service({
        id: 1,
        regions: [
          { region_id: 3, name: "London", country_code: "GB" },
          { region_id: 1, name: "Dublin", country_code: "IE" },
        ],
      }),
      service({
        id: 2,
        regions: [{ region_id: 1, name: "Dublin", country_code: "IE" }],
      }),
    ]);
    expect(regions.map((r) => r.name)).toEqual(["Dublin", "London"]);
  });

  test("no catalog, no regions", () => {
    expect(vpnRegions(undefined)).toEqual([]);
    expect(vpnRegions([service({ regions: [] })])).toEqual([]);
  });
});

describe("vpnServiceJsonLd", () => {
  test("prices the plan ex-VAT with its real billing period", () => {
    const ld = vpnServiceJsonLd(
      service({
        amount: 500,
        interval_type: CostPlanIntervalType.YEAR,
        interval_amount: 2,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    expect(ld.offers.price).toBe("5.00");
    expect(ld.offers.priceCurrency).toBe("EUR");
    expect(ld.offers.priceSpecification.valueAddedTaxIncluded).toBe(false);
    expect(ld.offers.priceSpecification.unitCode).toBe("ANN");
    expect(ld.offers.priceSpecification.billingDuration).toBe(2);
    expect(ld.url).toBe("https://lnvps.net/vpn");
  });

  test("names the exit regions in the description", () => {
    const ld = vpnServiceJsonLd(
      service({
        device_limit: 3,
        regions: [
          { region_id: 1, name: "Dublin", country_code: "IE" },
          { region_id: 3, name: "London", country_code: "GB" },
        ],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    expect(ld.description).toBe(
      "WireGuard VPN for up to 3 devices, exiting in Dublin, London.",
    );
  });

  test("a BTC price is left out rather than rounded to nothing", () => {
    // Amounts are millisats there, which two decimal places cannot express.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ld = vpnServiceJsonLd(service({ currency: "BTC" })) as any;
    expect(ld.offers).toBeUndefined();
    expect(ld.name).toBe("Monthly");
  });
});
