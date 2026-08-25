import { FormattedMessage, useIntl } from "react-intl";
import type { VmTemplateLimits } from "../api";
import { GB, formatTransferText } from "../utils/traffic";
import {
  type PlanLimitRow,
  headlineLimitRows,
  planLimitRows,
} from "../utils/plan-limits";

/**
 * The performance caps an offer carries, for the order flow.
 *
 * These describe the *offer*, never a host: two hosts backing the same plan are
 * deliberately indistinguishable to the buyer. An absent cap is not zero and
 * not unknown — it means the offer is bounded only by the hardware, which is
 * what every plan says today. An offer that caps nothing renders nothing;
 * callers drop their own heading with `hasPlanLimits`.
 */

function LimitValue({ row }: { row: PlanLimitRow }) {
  const intl = useIntl();
  const n = (v: number) => intl.formatNumber(v);

  switch (row.kind) {
    case "network":
      return (
        <FormattedMessage
          defaultMessage="{mbps} Mbit/s"
          values={{ mbps: n(row.mbps) }}
        />
      );
    case "transfer":
      return (
        <FormattedMessage
          defaultMessage="{size} egress per month"
          values={{ size: formatTransferText(intl, row.gb * GB, 0) }}
        />
      );
    case "diskIops":
      if (row.symmetric && row.read !== undefined) {
        return (
          <FormattedMessage
            defaultMessage="{n} IOPS"
            values={{ n: n(row.read) }}
          />
        );
      }
      return (
        <FormattedMessage
          defaultMessage="{read} read / {write} write IOPS"
          values={{
            read: row.read !== undefined ? n(row.read) : "∞",
            write: row.write !== undefined ? n(row.write) : "∞",
          }}
        />
      );
    case "diskThroughput":
      if (row.symmetric && row.read !== undefined) {
        return (
          <FormattedMessage
            defaultMessage="{n} MB/s"
            values={{ n: n(row.read) }}
          />
        );
      }
      return (
        <FormattedMessage
          defaultMessage="{read} read / {write} write MB/s"
          values={{
            read: row.read !== undefined ? n(row.read) : "∞",
            write: row.write !== undefined ? n(row.write) : "∞",
          }}
        />
      );
    case "cpuLimit":
      return (
        <FormattedMessage
          defaultMessage="{pct} of allocated cores"
          values={{
            pct: intl.formatNumber(row.fraction, {
              style: "percent",
              maximumFractionDigits: 0,
            }),
          }}
        />
      );
    case "firewallRules":
      return (
        <FormattedMessage
          defaultMessage="{n} rules"
          values={{ n: n(row.max) }}
        />
      );
  }
}

function LimitLabel({ kind }: { kind: PlanLimitRow["kind"] }) {
  switch (kind) {
    case "network":
      return <FormattedMessage defaultMessage="Bandwidth" />;
    case "transfer":
      return <FormattedMessage defaultMessage="Transfer" />;
    case "diskIops":
      return <FormattedMessage defaultMessage="Disk IOPS" />;
    case "diskThroughput":
      return <FormattedMessage defaultMessage="Disk throughput" />;
    case "cpuLimit":
      return <FormattedMessage defaultMessage="CPU limit" />;
    case "firewallRules":
      return <FormattedMessage defaultMessage="Firewall rules" />;
  }
}

/** Full cap list for the order page and the custom builder. */
export default function PlanLimits({
  limits,
  transferGb,
}: {
  limits?: VmTemplateLimits;
  transferGb?: number;
}) {
  const rows = planLimitRows(limits, transferGb);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div
          key={row.kind}
          className="flex items-baseline justify-between gap-3 text-xs"
        >
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
            <LimitLabel kind={row.kind} />
          </span>
          <span className="text-cyber-text-bright tabular-nums">
            <LimitValue row={row} />
          </span>
        </div>
      ))}
      {rows.some((r) => r.kind === "cpuLimit") && (
        <div className="text-[0.65rem] text-cyber-muted">
          <FormattedMessage defaultMessage="The CPU limit is a share of the cores listed above, not a smaller machine." />
        </div>
      )}
      {rows.some((r) => r.kind === "transfer") && (
        <div className="text-[0.65rem] text-cyber-muted">
          <FormattedMessage defaultMessage="Only egress counts against the transfer allowance, and exceeding it does not throttle or suspend the VM." />
        </div>
      )}
    </div>
  );
}

/**
 * One dense line for a plan card — bandwidth and monthly transfer only.
 * Renders nothing when neither is capped, so today's cards are unchanged.
 */
export function PlanLimitsInline({
  limits,
  transferGb,
}: {
  limits?: VmTemplateLimits;
  transferGb?: number;
}) {
  const rows = headlineLimitRows(limits, transferGb);
  if (rows.length === 0) return null;

  return (
    <div className="font-mono text-xs text-cyber-muted tabular-nums">
      {rows.map((row, i) => (
        <span key={row.kind}>
          {i > 0 && " · "}
          <LimitValue row={row} />
        </span>
      ))}
    </div>
  );
}
