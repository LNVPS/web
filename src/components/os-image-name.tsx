import { OsDistribution, VmOsImage } from "../api";

/** Human display names for OS distributions (the API returns lowercase enum
 * values like "ubuntu"; brands keep their canonical casing). */
const DISTRIBUTION_NAMES: Record<OsDistribution, string> = {
  [OsDistribution.UBUNTU]: "Ubuntu",
  [OsDistribution.DEBIAN]: "Debian",
  [OsDistribution.CENTOS]: "CentOS",
  [OsDistribution.FEDORA]: "Fedora",
  [OsDistribution.FREEBSD]: "FreeBSD",
  [OsDistribution.OPENSUSE]: "openSUSE",
  [OsDistribution.ARCHLINUX]: "Arch Linux",
  [OsDistribution.REDHATENTERPRISE]: "Red Hat Enterprise",
};

function distributionName(distribution: OsDistribution): string {
  return DISTRIBUTION_NAMES[distribution] ?? distribution;
}

export default function OsImageName({ image }: { image: VmOsImage }) {
  return (
    <span>
      {distributionName(image.distribution)} {image.version}
    </span>
  );
}
