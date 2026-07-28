import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import {
  CostPlanIntervalType,
  DiskInterface,
  DiskType,
  type VmTemplate,
} from "../api";
import { GiB } from "../const";
import { vpsTemplateJsonLd } from "./vps-seo";

const intl = createIntl({ locale: "en", messages: {} });

function template(over: Partial<VmTemplate> = {}): VmTemplate {
  return {
    id: 16,
    name: "Medium - Yearly Discount",
    created: "2024-06-05T00:00:00Z",
    cpu: 4,
    memory: 4 * GiB,
    disk_size: 160 * GiB,
    disk_type: DiskType.SSD,
    disk_interface: DiskInterface.PCIe,
    cost_plan: {
      id: 16,
      name: "Medium Yearly Discount Cost Plan",
      currency: "EUR",
      amount: 15000,
      interval_amount: 1,
      interval_type: CostPlanIntervalType.YEAR,
    },
    region: { id: 1, name: "Dublin (IE)", company_id: 1 },
    ...over,
  };
}

type Offer = {
  price: string;
  priceCurrency: string;
  areaServed: { name: string };
  priceSpecification: { unitCode: string; billingDuration: number };
};

function offerOf(schema: object): Offer | undefined {
  return (schema as { offers?: Offer }).offers;
}

describe("vpsTemplateJsonLd", () => {
  test("scales the amount out of minor units and keeps the billing period", () => {
    const offer = offerOf(vpsTemplateJsonLd(template(), intl));
    expect(offer?.price).toBe("150.00");
    expect(offer?.priceCurrency).toBe("EUR");
    expect(offer?.priceSpecification.unitCode).toBe("ANN");
    expect(offer?.priceSpecification.billingDuration).toBe(1);
  });

  test("serves the region the template is in", () => {
    const offer = offerOf(vpsTemplateJsonLd(template(), intl));
    expect(offer?.areaServed.name).toBe("Dublin (IE)");
  });

  test("emits no offer for a BTC plan, whose amount is millisats", () => {
    const schema = vpsTemplateJsonLd(
      template({
        cost_plan: { ...template().cost_plan, currency: "BTC", amount: 1791986 },
      }),
      intl,
    );
    expect(offerOf(schema)).toBeUndefined();
    expect((schema as { name: string }).name).toBe("Medium - Yearly Discount");
  });

  test("describes the plan from its own specs", () => {
    const schema = vpsTemplateJsonLd(template(), intl) as {
      description: string;
    };
    expect(schema.description).toBe(
      "4 vCPU, 4GB RAM, 160GB SSD storage in Dublin (IE).",
    );
  });
});
