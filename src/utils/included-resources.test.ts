import { describe, expect, test } from "bun:test";
import { includedResources } from "./included-resources";
import type {
  VmCustomTemplateParams,
  VmTemplate,
  VmTemplateResponse,
} from "../api";

function template(over: Partial<VmTemplate> = {}): VmTemplate {
  return {
    id: 1,
    name: "plan",
    created: "",
    cpu: 2,
    memory: 2048,
    disk_size: 80,
    disk_type: "ssd",
    disk_interface: "pcie",
    ip4_count: 1,
    ip6_count: 1,
    cost_plan: {
      id: 1,
      name: "m",
      amount: 5,
      currency: "EUR",
      interval_amount: 1,
      interval_type: "month",
    },
    region: { id: 1, name: "London (GB)", company_id: 1 },
    ...over,
  } as VmTemplate;
}

function custom(
  over: Partial<VmCustomTemplateParams> = {},
): VmCustomTemplateParams {
  return {
    id: 1,
    name: "custom",
    region: { id: 1, name: "London (GB)", company_id: 1 },
    max_cpu: 8,
    min_cpu: 1,
    min_memory: 1024,
    max_memory: 16384,
    min_ip4: 1,
    max_ip4: 1,
    min_ip6: 1,
    max_ip6: 1,
    disks: [],
    ...over,
  } as VmCustomTemplateParams;
}

const offers = (o: Partial<VmTemplateResponse>): VmTemplateResponse => ({
  templates: [],
  ...o,
});

describe("includedResources", () => {
  test("an empty or absent catalog supports no claim", () => {
    expect(includedResources(undefined)).toBeUndefined();
    expect(includedResources(offers({}))).toBeUndefined();
  });

  test("reads the counts off the templates", () => {
    const r = includedResources(
      offers({ templates: [template({ ip4_count: 1, ip6_count: 1 })] }),
    );
    expect(r).toEqual({
      ip4: 1,
      ip6: 1,
      uniformIps: true,
      transfer: { kind: "unmetered" },
    });
  });

  test("a custom plan contributes its floor, not its ceiling", () => {
    const r = includedResources(
      offers({ custom_template: [custom({ min_ip4: 1, max_ip4: 8 })] }),
    );
    expect(r?.ip4).toBe(1);
  });

  test("differing counts are flagged, and the lower one is kept", () => {
    const r = includedResources(
      offers({
        templates: [template({ ip6_count: 1 }), template({ ip6_count: 0 })],
      }),
    );
    expect(r?.uniformIps).toBe(false);
    expect(r?.ip6).toBe(0);
  });

  test("an allowance every plan shares is reported as such", () => {
    const r = includedResources(
      offers({
        templates: [template({ transfer_gb: 2000 })],
        custom_template: [custom({ transfer_gb: 2000 })],
      }),
    );
    expect(r?.transfer).toEqual({ kind: "same", gb: 2000 });
  });

  test("a zero allowance is unmetered, not an exhausted plan", () => {
    const r = includedResources(
      offers({ templates: [template({ transfer_gb: 0 })] }),
    );
    expect(r?.transfer).toEqual({ kind: "unmetered" });
  });

  test("mixed allowances, metered or not, are reported as varying", () => {
    expect(
      includedResources(
        offers({
          templates: [
            template({ transfer_gb: 2000 }),
            template({ transfer_gb: 5000 }),
          ],
        }),
      )?.transfer,
    ).toEqual({ kind: "varies" });

    expect(
      includedResources(
        offers({
          templates: [template({ transfer_gb: 2000 }), template()],
        }),
      )?.transfer,
    ).toEqual({ kind: "varies" });
  });
});
