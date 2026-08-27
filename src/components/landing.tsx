import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import type { VmCustomTemplateParams } from "../api";
import BytesSize from "./bytes";

/** Section heading in the site's eyebrow style, kept as an h2 for structure.
 * Mirrors `SectionHeading` in `home.tsx:172`. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyber-muted">
      <span className="h-px w-3 bg-cyber-border-bright" />
      {children}
    </h2>
  );
}

/** A titled block of landing-page prose. */
export function Section({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

/** The page's call to action into the VPS order flow. */
export function OrderCta({ children }: { children: ReactNode }) {
  return (
    <div>
      <Link
        to="/order"
        className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
      >
        {children}
      </Link>
    </div>
  );
}

/**
 * What one region's custom builder will accept, straight off its catalog row:
 * the CPU and memory ranges and one line per disk type it offers.
 *
 * Dublin offers HDD as well as SSD and the other two do not, so the disk lines
 * are a map over whatever `disks` contains rather than a fixed pair. Nothing
 * here is written down per region — the same component renders every region
 * correctly, including one added after this ships.
 */
export function RegionSpecs({ template }: { template: VmCustomTemplateParams }) {
  return (
    <ul className="m-0 flex max-w-prose list-none flex-col gap-1 p-0 text-cyber-text">
      <li>
        <FormattedMessage
          defaultMessage="{min}-{max} vCPU"
          values={{ min: template.min_cpu, max: template.max_cpu }}
        />
      </li>
      <li>
        <FormattedMessage
          defaultMessage="{min}-{max} memory"
          values={{
            min: <BytesSize value={template.min_memory} />,
            max: <BytesSize value={template.max_memory} />,
          }}
        />
      </li>
      {template.disks.map((d) => (
        <li key={`${d.disk_type}-${d.disk_interface}`}>
          <FormattedMessage
            defaultMessage="{min}-{max} {type} storage"
            values={{
              min: <BytesSize value={d.min_disk} />,
              max: <BytesSize value={d.max_disk} />,
              type: d.disk_type.toUpperCase(),
            }}
          />
        </li>
      ))}
    </ul>
  );
}
