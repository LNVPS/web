import classNames from "classnames";
import type { SimpleIcon } from "simple-icons";
import {
  siAlmalinux,
  siAlpinelinux,
  siArchlinux,
  siCentos,
  siDebian,
  siFedora,
  siFreebsd,
  siGentoo,
  siNetbsd,
  siNixos,
  siOpenbsd,
  siOpensuse,
  siRedhat,
  siRockylinux,
  siUbuntu,
  siVoidlinux,
} from "simple-icons";
import { OsDistribution } from "../api";

/** Official distribution logos (path data + brand colour) sourced from
 * simple-icons, keyed by our OS distribution enum. */
const DISTRIBUTION_ICON: Record<OsDistribution, SimpleIcon> = {
  [OsDistribution.UBUNTU]: siUbuntu,
  [OsDistribution.DEBIAN]: siDebian,
  [OsDistribution.CENTOS]: siCentos,
  [OsDistribution.FEDORA]: siFedora,
  [OsDistribution.FREEBSD]: siFreebsd,
  [OsDistribution.OPENSUSE]: siOpensuse,
  [OsDistribution.ARCHLINUX]: siArchlinux,
  [OsDistribution.REDHATENTERPRISE]: siRedhat,
  [OsDistribution.ALMALINUX]: siAlmalinux,
  [OsDistribution.ROCKYLINUX]: siRockylinux,
  [OsDistribution.ALPINE]: siAlpinelinux,
  [OsDistribution.NIXOS]: siNixos,
  [OsDistribution.OPENBSD]: siOpenbsd,
  [OsDistribution.NETBSD]: siNetbsd,
  [OsDistribution.GENTOO]: siGentoo,
  [OsDistribution.VOIDLINUX]: siVoidlinux,
};

/** Brand colours that don't work on the dark theme (e.g. AlmaLinux's mark is
 * black in simple-icons); substitute a visible colour from the same brand. */
const COLOR_OVERRIDE: Partial<Record<OsDistribution, string>> = {
  // AlmaLinux's logo is multicoloured; its primary brand blue reads well here.
  [OsDistribution.ALMALINUX]: "0069DA",
};

export default function OsImageIcon({
  distribution,
  className,
}: {
  distribution: OsDistribution;
  className?: string;
}) {
  const icon = DISTRIBUTION_ICON[distribution];
  if (!icon) {
    return (
      <span
        aria-hidden
        className={classNames(
          "grid place-items-center rounded-sm w-8 h-8 shrink-0 border border-cyber-border bg-cyber-panel-light text-cyber-muted text-sm font-semibold",
          className,
        )}
      >
        {distribution.charAt(0).toUpperCase()}
      </span>
    );
  }
  const color = `#${COLOR_OVERRIDE[distribution] ?? icon.hex}`;
  return (
    <span
      aria-hidden
      className={classNames(
        "grid place-items-center rounded-sm w-8 h-8 shrink-0 border",
        className,
      )}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}1a` }}
    >
      <svg
        role="img"
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{icon.title}</title>
        <path d={icon.path} />
      </svg>
    </span>
  );
}
