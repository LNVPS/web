import { describe, expect, test } from "bun:test";
import {
  CostPlanIntervalType,
  CpuMfg,
  DiskInterface,
  DiskType,
  type VmCustomTemplateParams,
} from "../api";
import { GiB } from "../const";
import {
  cpuVariants,
  distinctIntervals,
  intervalKey,
  preferredTemplate,
  templateInterval,
} from "./custom-intervals";
import { regionCustomTemplate } from "./regions";

function tpl(
  id: number,
  interval?: CostPlanIntervalType,
  extra: Partial<VmCustomTemplateParams> = {},
): VmCustomTemplateParams {
  return {
    id,
    name: `t${id}`,
    region: { id: 1, name: "Dublin (IE)", company_id: 1 },
    min_cpu: 1,
    max_cpu: 8,
    min_memory: GiB,
    max_memory: 16 * GiB,
    min_ip4: 1,
    max_ip4: 1,
    min_ip6: 0,
    max_ip6: 0,
    disks: [
      {
        min_disk: 10 * GiB,
        max_disk: 100 * GiB,
        disk_type: DiskType.SSD,
        disk_interface: DiskInterface.PCIe,
      },
    ],
    interval_type: interval,
    ...extra,
  };
}

describe("distinctIntervals", () => {
  test("orders longest first regardless of API order", () => {
    const got = distinctIntervals([
      tpl(1, CostPlanIntervalType.HOUR),
      tpl(2, CostPlanIntervalType.MONTH),
      tpl(3, CostPlanIntervalType.DAY),
    ]).map((i) => i.type);
    expect(got).toEqual([
      CostPlanIntervalType.MONTH,
      CostPlanIntervalType.DAY,
      CostPlanIntervalType.HOUR,
    ]);
  });

  test("one interval yields one entry, so no tabs are shown", () => {
    expect(
      distinctIntervals([
        tpl(1, CostPlanIntervalType.MONTH),
        tpl(2, CostPlanIntervalType.MONTH),
      ]),
    ).toHaveLength(1);
  });

  test("a template without an interval is monthly", () => {
    expect(templateInterval(tpl(1))).toEqual({
      type: CostPlanIntervalType.MONTH,
      amount: 1,
    });
    expect(intervalKey(templateInterval(tpl(1)))).toBe("1:month");
  });
});

describe("cpuVariants", () => {
  test("collapses the same CPU constraints across intervals", () => {
    const amd = { cpu_mfg: CpuMfg.AMD };
    const got = cpuVariants([
      tpl(1, CostPlanIntervalType.MONTH, amd),
      tpl(2, CostPlanIntervalType.HOUR, amd),
      tpl(3, CostPlanIntervalType.MONTH, { cpu_mfg: CpuMfg.INTEL }),
    ]);
    expect(got.map((t) => t.id)).toEqual([1, 3]);
  });
});

describe("cpuVariants with unlabelled duplicates", () => {
  test("two identical-looking templates stay separately reachable", () => {
    // The live API sends no interval yet: a second template for the same
    // region must not be swallowed into the first.
    expect(cpuVariants([tpl(7), tpl(8)]).map((t) => t.id)).toEqual([7, 8]);
  });

  test("same machine at distinct intervals is one variant", () => {
    const got = cpuVariants([
      tpl(7, CostPlanIntervalType.MONTH),
      tpl(8, CostPlanIntervalType.HOUR),
    ]);
    expect(got.map((t) => t.id)).toEqual([7]);
  });
});

describe("regionCustomTemplate with several intervals", () => {
  test("quotes the monthly template even when hourly comes first", () => {
    const hourly = tpl(1, CostPlanIntervalType.HOUR);
    const monthly = tpl(2, CostPlanIntervalType.MONTH);
    expect(preferredTemplate([hourly, monthly])).toBe(monthly);
    expect(
      regionCustomTemplate(
        { templates: [], custom_template: [hourly, monthly] },
        1,
      ),
    ).toBe(monthly);
  });
});
