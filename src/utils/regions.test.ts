import { describe, expect, test } from "bun:test";
import {
  DiskInterface,
  DiskType,
  type VmCustomTemplateParams,
  type VmTemplateResponse,
} from "../api";
import { GiB, TiB } from "../const";
import {
  regionCustomTemplate,
  regionDisk,
  regionEntrySpec,
  regionMaxDisk,
} from "./regions";

const dublin: VmCustomTemplateParams = {
  id: 4,
  name: "main_2026",
  region: { id: 1, name: "Dublin (IE)", company_id: 1 },
  min_cpu: 1,
  max_cpu: 64,
  min_memory: 1 * GiB,
  max_memory: 128 * GiB,
  disks: [
    {
      min_disk: 100 * GiB,
      max_disk: 10 * TiB,
      disk_type: DiskType.HDD,
      disk_interface: DiskInterface.SATA,
    },
    {
      min_disk: 10 * GiB,
      max_disk: 3 * TiB,
      disk_type: DiskType.SSD,
      disk_interface: DiskInterface.PCIe,
    },
  ],
};

const london: VmCustomTemplateParams = {
  id: 6,
  name: "main_2026",
  region: { id: 3, name: "London (GB)", company_id: 1 },
  min_cpu: 1,
  max_cpu: 16,
  min_memory: 1 * GiB,
  max_memory: 16 * GiB,
  disks: [
    {
      min_disk: 10 * GiB,
      max_disk: 500 * GiB,
      disk_type: DiskType.SSD,
      disk_interface: DiskInterface.PCIe,
    },
  ],
};

const offers: VmTemplateResponse = {
  templates: [],
  custom_template: [london, dublin],
};

describe("regionCustomTemplate", () => {
  test("picks the row for the region, not the first row", () => {
    expect(regionCustomTemplate(offers, 1)).toBe(dublin);
    expect(regionCustomTemplate(offers, 3)).toBe(london);
  });

  test("undefined for a region the catalog did not return", () => {
    expect(regionCustomTemplate(offers, 99)).toBeUndefined();
    expect(regionCustomTemplate(undefined, 1)).toBeUndefined();
    expect(regionCustomTemplate({ templates: [] }, 1)).toBeUndefined();
  });
});

describe("regionEntrySpec", () => {
  test("is the region's minimums on its smallest disk", () => {
    expect(regionEntrySpec(dublin)).toEqual({
      pricing_id: 4,
      cpu: 1,
      memory: 1 * GiB,
      disk: 10 * GiB,
      disk_type: DiskType.SSD,
      disk_interface: DiskInterface.PCIe,
    });
  });

  test("undefined without a template or a disk", () => {
    expect(regionEntrySpec(undefined)).toBeUndefined();
    expect(regionEntrySpec({ ...dublin, disks: [] })).toBeUndefined();
  });
});

describe("regionDisk / regionMaxDisk", () => {
  test("finds a disk type the region offers", () => {
    expect(regionDisk(dublin, DiskType.HDD)?.max_disk).toBe(10 * TiB);
    expect(regionDisk(london, DiskType.HDD)).toBeUndefined();
  });

  test("largest disk is across types, not the first listed", () => {
    expect(regionMaxDisk(dublin)?.disk_type).toBe(DiskType.HDD);
    expect(regionMaxDisk(london)?.max_disk).toBe(500 * GiB);
    expect(regionMaxDisk(undefined)).toBeUndefined();
  });
});
