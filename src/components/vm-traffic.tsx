import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import type { VmTrafficSummary } from "../api";
import { StatusPill, TONE } from "./billing";
import { formatTransferText, transferUsage } from "../utils/traffic";

/**
 * A VM's network transfer for the current UTC calendar month, rendered from
 * `VmInstance.traffic` alone — no extra request.
 *
 * Two things the copy here must keep straight: the allowance is **egress only**
 * (ingress is shown because it's interesting, never counted), and
 * exceeding it currently does nothing at all — no throttle, no suspension, no
 * overage charge. An unmetered plan, which is every plan today, gets the
 * figures without a bar, because there is no limit to draw one against.
 */
export default function VmTrafficPanel({
  traffic,
}: {
  traffic: VmTrafficSummary;
}) {
  const intl = useIntl();
  const usage = transferUsage(traffic);
  const period = (
    <FormattedMessage
      defaultMessage="{start} – {end} UTC"
      values={{
        start: (
          <FormattedDate
            value={`${traffic.period_start}T00:00:00Z`}
            timeZone="UTC"
            day="numeric"
            month="short"
          />
        ),
        end: (
          <FormattedDate
            value={`${traffic.period_end}T00:00:00Z`}
            timeZone="UTC"
            day="numeric"
            month="short"
          />
        ),
      }}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl leading-none text-cyber-text-bright tabular-nums">
            {formatTransferText(intl, traffic.bytes_out)}
          </span>
          <span className="text-sm text-cyber-muted">
            {usage.metered ? (
              <FormattedMessage
                defaultMessage="of {allowance} egress"
                values={{
                  allowance: formatTransferText(intl, usage.allowanceBytes),
                }}
              />
            ) : (
              <FormattedMessage defaultMessage="egress" />
            )}
          </span>
          <span className="text-xs text-cyber-muted tabular-nums">
            <FormattedMessage
              defaultMessage="· {bytes} ingress"
              values={{ bytes: formatTransferText(intl, traffic.bytes_in) }}
            />
          </span>
        </div>
        {usage.metered ? (
          <StatusPill tone={usage.tone}>
            <FormattedMessage
              defaultMessage="{pct}% used"
              values={{ pct: Math.round(usage.pct) }}
            />
          </StatusPill>
        ) : (
          <StatusPill tone="muted">
            <FormattedMessage defaultMessage="Unmetered" />
          </StatusPill>
        )}
      </div>

      {usage.metered && (
        <div className="h-1 rounded-full bg-cyber-panel-light overflow-hidden">
          <div
            className={"h-full rounded-full " + TONE[usage.tone].fill}
            style={{ width: `${usage.meterPct}%` }}
          />
        </div>
      )}

      <div className="text-xs text-cyber-muted tabular-nums">{period}</div>

      {usage.metered && usage.over && (
        <div className="text-xs text-cyber-danger">
          <FormattedMessage defaultMessage="You have used your egress allowance for this month. Nothing has been done to your VM — it is not throttled, suspended or charged for the overage — and the allowance resets on the 1st." />
        </div>
      )}

      <div className="text-xs text-cyber-muted">
        {usage.metered ? (
          <FormattedMessage defaultMessage="The allowance covers egress only and resets on the 1st of each month. Ingress is shown for reference and never counts against it." />
        ) : (
          <FormattedMessage defaultMessage="This plan has no transfer limit. Figures are for the current calendar month and reset on the 1st." />
        )}
      </div>
    </div>
  );
}
