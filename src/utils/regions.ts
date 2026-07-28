import {
  DiskType,
  type VmCustomTemplateDiskParams,
  type VmCustomTemplateParams,
  type VmCustomTemplateRequest,
  type VmTemplateResponse,
} from "../api";

/**
 * The custom-template parameters for one region, or `undefined` when the
 * catalog did not return that region.
 *
 * Everything a region landing page says about specs is read from this row —
 * the CPU and memory ranges, which disk types exist and how big they go. A
 * region that stops being offered drops out of `GET /api/v1/vm/templates` and
 * the page then renders its prose without figures, which is the honest state.
 */
export function regionCustomTemplate(
  offers: VmTemplateResponse | undefined,
  regionId: number,
): VmCustomTemplateParams | undefined {
  return offers?.custom_template?.find((t) => t.region.id === regionId);
}

/** The disk options of a region, cheapest-media first (SSD before HDD). */
export function regionDisk(
  template: VmCustomTemplateParams | undefined,
  type: DiskType,
): VmCustomTemplateDiskParams | undefined {
  return template?.disks.find((d) => d.disk_type === type);
}

/**
 * The smallest machine a region can build: its minimum CPU, its minimum
 * memory and the smallest disk it offers.
 *
 * This is what the pages quote a "from" price for, and it is derived rather
 * than written down — the entry spec of a region is whatever the catalog says
 * its minimums are, and it moves when they move.
 *
 * `undefined` when the region offers no disk at all, since there is then no
 * machine to price.
 */
export function regionEntrySpec(
  template: VmCustomTemplateParams | undefined,
): VmCustomTemplateRequest | undefined {
  if (!template) return undefined;
  const disk = template.disks.reduce<VmCustomTemplateDiskParams | undefined>(
    (smallest, d) =>
      smallest === undefined || d.min_disk < smallest.min_disk ? d : smallest,
    undefined,
  );
  if (!disk) return undefined;
  return {
    pricing_id: template.id,
    cpu: template.min_cpu,
    memory: template.min_memory,
    disk: disk.min_disk,
    disk_type: disk.disk_type,
    disk_interface: disk.disk_interface,
  };
}

/** The largest disk of any type the region offers, for the "up to" lines. */
export function regionMaxDisk(
  template: VmCustomTemplateParams | undefined,
): VmCustomTemplateDiskParams | undefined {
  return template?.disks.reduce<VmCustomTemplateDiskParams | undefined>(
    (largest, d) =>
      largest === undefined || d.max_disk > largest.max_disk ? d : largest,
    undefined,
  );
}
