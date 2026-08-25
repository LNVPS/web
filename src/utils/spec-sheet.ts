import { CpuArch, CpuMfg, DiskInterface, type VmTemplate } from "../api";
import { formatPortSpeed } from "./plan-limits";

/**
 * The machine an offer describes, arranged as a nameplate rather than a
 * sentence.
 *
 * The order page used to print a spec line and then a separate "Performance"
 * band, which asked the buyer to work out for themselves that "200 MB/s"
 * bounded the disk they had just read about. Here every ceiling is attached to
 * the resource it bounds, so a cell is the whole truth about one part of the
 * machine.
 *
 * Absent caps stay absent: the API omits a field when it is uncapped, and a
 * missing ceiling must never render as 0.
 */

export interface SpecSheet {
  cpu: {
    cores: number;
    /** "AMD x86_64" when the offer pins a manufacturer or architecture. */
    detail?: string;
    /** Fraction of the listed cores the guest may use; absent when the whole. */
    limitFraction?: number;
  };
  memoryBytes: number;
  storage: {
    bytes: number;
    /** "SSD" / "HDD". */
    type: string;
    /** How the disk is attached: "NVMe", "SCSI", "SATA". Two offers with the
     *  same size and media can still differ here, and it is the difference a
     *  buyer feels. */
    interface?: string;
    mbps?: { read?: number; write?: number; symmetric: boolean };
    iops?: { read?: number; write?: number; symmetric: boolean };
  };
  network: {
    /** "1Gbps"; absent when the offer caps no bandwidth. */
    portSpeed?: string;
    /** Monthly outbound allowance in GB; absent means unmetered. */
    transferGb?: number;
  };
  addresses: { ip4: number; ip6: number };
  /** Max user firewall rules; absent means the server default. */
  firewallRules?: number;
  region?: string;
}

export function formatCpuMfg(mfg?: CpuMfg): string | undefined {
  switch (mfg) {
    case CpuMfg.INTEL:
      return "Intel";
    case CpuMfg.AMD:
      return "AMD";
    case CpuMfg.APPLE:
      return "Apple";
    case CpuMfg.NVIDIA:
      return "NVIDIA";
    case CpuMfg.ARM:
      return "ARM";
    default:
      return undefined;
  }
}

export function formatCpuArch(arch?: CpuArch): string | undefined {
  switch (arch) {
    case CpuArch.X86_64:
      return "x86_64";
    case CpuArch.ARM64:
      return "ARM64";
    default:
      return undefined;
  }
}

/**
 * Bus names as a buyer knows them, not as the API spells them: a PCIe-attached
 * disk is what everyone calls NVMe, and "PCIe" on a spec sheet reads like a
 * slot rather than a drive. An unknown value renders nothing rather than
 * leaking an uppercased enum into the page.
 */
export function formatDiskInterface(iface?: DiskInterface): string | undefined {
  switch (iface) {
    case DiskInterface.PCIe:
      return "NVMe";
    case DiskInterface.SCSI:
      return "SCSI";
    case DiskInterface.SATA:
      return "SATA";
    default:
      return undefined;
  }
}

function pair(read?: number, write?: number) {
  if (read === undefined && write === undefined) return undefined;
  return { read, write, symmetric: read === write };
}

export function specSheet(template: VmTemplate): SpecSheet {
  const limits = template.limits;
  const detail = [
    formatCpuMfg(template.cpu_mfg),
    formatCpuArch(template.cpu_arch),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    cpu: {
      cores: template.cpu,
      detail: detail.length > 0 ? detail : undefined,
      // 1.0 or more is the whole of the allocated cores, i.e. no ceiling at
      // all — printing "100%" would read as a restriction where there is none.
      limitFraction:
        limits?.cpu_limit !== undefined && limits.cpu_limit < 1
          ? limits.cpu_limit
          : undefined,
    },
    memoryBytes: template.memory,
    storage: {
      bytes: template.disk_size,
      type: template.disk_type.toUpperCase(),
      interface: formatDiskInterface(template.disk_interface),
      mbps: pair(limits?.disk_mbps_read, limits?.disk_mbps_write),
      iops: pair(limits?.disk_iops_read, limits?.disk_iops_write),
    },
    network: {
      portSpeed: formatPortSpeed(limits?.network_mbps),
      // 0 is unmetered, matching the worker's quota check.
      transferGb:
        template.transfer_gb !== undefined && template.transfer_gb > 0
          ? template.transfer_gb
          : undefined,
    },
    addresses: { ip4: template.ip4_count, ip6: template.ip6_count },
    firewallRules: limits?.firewall_rule_limit,
    region: template.region?.name,
  };
}
