import { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { VmTemplate } from "../api";
import { Card, CardHeader } from "./card";
import CostLabel from "./cost";
import BytesSize from "./bytes";
import { specSheet } from "../utils/spec-sheet";
import { GB, formatTransferText } from "../utils/traffic";
import { diskThroughput, iopsUnits } from "../utils/plan-limits";

/**
 * The machine, as a nameplate.
 *
 * A server is bought by its four numbers, so they get four equal cells on a
 * hairline grid — the faceplate of the thing being ordered — and each cell
 * carries its own ceiling underneath. Nothing here is decoration: the second
 * line of a cell is the cap the hypervisor enforces on the figure above it.
 */

function Cell({
  label,
  value,
  detail,
  limit,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  /** The ceiling the hypervisor enforces on this resource. Kept on its own
   *  line behind a "limit" marker: printed beside the hardware it reads as a
   *  property of the hardware, and "NVMe · 200 MB/s" says the drive is slow
   *  when it says the share of it is bounded. */
  limit?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 bg-cyber-panel px-4 py-3">
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-cyber-muted">
        {label}
      </span>
      <span className="text-lg leading-none text-cyber-text-bright tabular-nums">
        {value}
      </span>
      {/* Reserved even when empty so the four cells keep one baseline. */}
      <span className="min-h-[0.9rem] text-[0.65rem] leading-tight text-cyber-text tabular-nums">
        {detail}
      </span>
      {limit && (
        <span className="text-[0.65rem] leading-tight text-cyber-muted tabular-nums">
          <span className="uppercase tracking-[0.15em] text-cyber-muted/80">
            <FormattedMessage defaultMessage="Limit" />
          </span>{" "}
          {limit}
        </span>
      )}
    </div>
  );
}

export default function SpecSheet({ template }: { template: VmTemplate }) {
  const intl = useIntl();
  const n = (v: number) => intl.formatNumber(v);
  const spec = specSheet(template);

  const storageDetail = [spec.storage.type, spec.storage.interface]
    .filter(Boolean)
    .join(" · ");

  /**
   * A cap that differs by direction is spelled out per direction. "200/100
   * MB/s" saves a line and costs the reader the one thing the pair encodes,
   * which is which number applies when they write. A direction the offer
   * leaves uncapped is simply not listed — no "∞" to decode.
   */
  const rw = (
    cap: { read?: number; write?: number; symmetric: boolean } | undefined,
    format: (v: number) => string,
  ): Array<string> => {
    if (!cap) return [];
    if (cap.symmetric && cap.read !== undefined) {
      return [format(cap.read)];
    }
    return [
      cap.read !== undefined &&
        intl.formatMessage(
          { defaultMessage: "{v} read" },
          { v: format(cap.read) },
        ),
      cap.write !== undefined &&
        intl.formatMessage(
          { defaultMessage: "{v} write" },
          { v: format(cap.write) },
        ),
    ].filter((s): s is string => typeof s === "string");
  };

  /** MB/s until a gigabyte a second, GB/s above it — a 2,000 MB/s NVMe cap is
   *  written 2 GB/s everywhere else. */
  const throughput = (mbps: number) => {
    const t = diskThroughput(mbps);
    return `${n(t.value)} ${t.unit}`;
  };

  const iops = (v: number) => {
    const u = iopsUnits(v);
    return `${n(u.value)}${u.unit} IOPS`;
  };

  const storageLimit = [
    ...rw(spec.storage.mbps, throughput),
    ...rw(spec.storage.iops, iops),
  ].join(" · ");

  // The firewall ceiling is a network cap, so it rides with the transfer
  // allowance rather than taking chrome of its own.
  const networkLimit = [
    spec.network.transferGb !== undefined &&
      intl.formatMessage(
        { defaultMessage: "{size} egress/month" },
        { size: formatTransferText(intl, spec.network.transferGb * GB) },
      ),
    spec.firewallRules !== undefined &&
      intl.formatMessage(
        { defaultMessage: "{n} firewall rules" },
        { n: n(spec.firewallRules) },
      ),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardHeader
        strip
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-sm uppercase tracking-[0.15em] text-cyber-primary">
            {template.name}
          </span>
          {spec.region && (
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
              {spec.region}
            </span>
          )}
        </div>
        {template.cost_plan && (
          <span className="text-cyber-text-bright tabular-nums">
            <CostLabel
              cost={template.cost_plan}
              companyId={template.region?.company_id}
            />
          </span>
        )}
      </CardHeader>

      {/* gap-px over the border colour draws the hairlines, so the grid can
          reflow to two columns on a phone without stranded rules. */}
      <div className="grid grid-cols-1 gap-px bg-cyber-border sm:grid-cols-2 lg:grid-cols-4">
        <Cell
          label={<FormattedMessage defaultMessage="CPU" />}
          value={
            <FormattedMessage
              defaultMessage="{n} vCPU"
              values={{ n: n(spec.cpu.cores) }}
            />
          }
          detail={spec.cpu.detail}
          limit={
            spec.cpu.limitFraction !== undefined && (
              <FormattedMessage
                defaultMessage="{pct} of the cores"
                values={{
                  pct: intl.formatNumber(spec.cpu.limitFraction, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  }),
                }}
              />
            )
          }
        />
        <Cell
          label={<FormattedMessage defaultMessage="Memory" />}
          value={<BytesSize value={spec.memoryBytes} />}
        />
        <Cell
          label={<FormattedMessage defaultMessage="Storage" />}
          value={<BytesSize value={spec.storage.bytes} />}
          detail={storageDetail}
          limit={storageLimit}
        />
        {/* Addresses live here rather than in a cell of their own: they are
            part of how the machine is connected, and this cell's cap line is
            already where its ceilings go. */}
        <Cell
          label={<FormattedMessage defaultMessage="Network" />}
          value={
            spec.network.portSpeed ?? (
              <FormattedMessage defaultMessage="Shared" />
            )
          }
          detail={
            <FormattedMessage
              defaultMessage="{ip4} × IPv4 · {ip6} × IPv6"
              values={{
                ip4: n(spec.addresses.ip4),
                ip6: n(spec.addresses.ip6),
              }}
            />
          }
          limit={networkLimit}
        />
      </div>
    </Card>
  );
}
