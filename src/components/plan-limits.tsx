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

function LimitValue({
  row,
  labelled,
}: {
  row: PlanLimitRow;
  /** Chained-line variant: values carry their own noun, since no label sits beside them. */
  labelled?: boolean;
}) {
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
        return labelled ? (
          <FormattedMessage
            defaultMessage="{n} disk IOPS"
            values={{ n: n(row.read) }}
          />
        ) : (
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
        return labelled ? (
          <FormattedMessage
            defaultMessage="{n} MB/s disk"
            values={{ n: n(row.read) }}
          />
        ) : (
          <FormattedMessage
            defaultMessage="{n} MB/s"
            values={{ n: n(row.read) }}
          />
        );
      }
      return labelled ? (
        <FormattedMessage
          defaultMessage="{read} read / {write} write MB/s disk"
          values={{
            read: row.read !== undefined ? n(row.read) : "∞",
            write: row.write !== undefined ? n(row.write) : "∞",
          }}
        />
      ) : (
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
      return labelled ? (
        <FormattedMessage
          defaultMessage="{n} firewall rules"
          values={{ n: n(row.max) }}
        />
      ) : (
        <FormattedMessage
          defaultMessage="{n} rules"
          values={{ n: n(row.max) }}
        />
      );
  }
}

/**
 * Full cap list for the order page and the custom builder, chained onto one
 * dense line like the CPU/RAM/disk/IP specification line: label columns turned
 * three or four short figures into a block that read heavier than the
 * specification it qualifies.
 */
export default function PlanLimits({
  limits,
  transferGb,
  exclude,
  compact,
}: {
  limits?: VmTemplateLimits;
  transferGb?: number;
  /** Caps the surrounding surface already states — the custom builder puts the
   *  port speed on its specification line, so repeating it here reads as two
   *  different numbers. */
  exclude?: Array<PlanLimitRow["kind"]>;
  /** Line only, no footnotes: for a summary footer that has no room to explain. */
  compact?: boolean;
}) {
  const rows = planLimitRows(limits, transferGb).filter(
    (r) => !exclude?.includes(r.kind),
  );
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={
          compact
            ? "font-mono text-xs text-cyber-muted tabular-nums"
            : "font-mono text-xs text-cyber-text-bright tabular-nums"
        }
      >
        {rows.map((row, i) => (
          <span key={row.kind}>
            {i > 0 && " · "}
            <LimitValue row={row} labelled />
          </span>
        ))}
      </div>
      {!compact && rows.some((r) => r.kind === "cpuLimit") && (
        <div className="text-[0.65rem] text-cyber-muted">
          <FormattedMessage defaultMessage="The CPU limit is a share of the cores listed above, not a smaller machine." />
        </div>
      )}
      {!compact && rows.some((r) => r.kind === "transfer") && (
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
