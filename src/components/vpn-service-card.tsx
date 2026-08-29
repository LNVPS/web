import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import type { VpnService } from "../api";
import { Card, CardBody, CardTitle } from "./card";
import CostLabel from "./cost";
import RegionName from "./region-name";

/**
 * One VPN plan on sale: what it costs, how many devices it carries, and where
 * it exits.
 *
 * The action is passed in because the same card sells the plan in two places:
 * on the homepage it sends a visitor to the product, in the account it buys.
 */
export default function VpnServiceCard({
  service,
  action,
}: {
  service: VpnService;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardTitle
        right={
          <span className="text-cyber-text-bright tabular-nums">
            <CostLabel
              cost={{
                currency: service.currency,
                amount: service.amount,
                interval_type: service.interval_type,
                interval_amount: service.interval_amount,
              }}
            />
          </span>
        }
      >
        {service.name}
      </CardTitle>
      <CardBody className="flex flex-col gap-4 px-4 py-4">
        <div className="font-mono text-xs text-cyber-muted tabular-nums">
          <FormattedMessage
            defaultMessage="{count, plural, one {# device} other {# devices}}"
            values={{ count: service.device_limit }}
          />
          {" · "}
          {service.ipv4 && service.ipv6
            ? "IPv4 + IPv6"
            : service.ipv6
              ? "IPv6"
              : "IPv4"}
          {service.setup_amount > 0 && (
            <>
              {" · "}
              <FormattedMessage
                defaultMessage="{amount} setup"
                values={{
                  amount: (
                    <CostLabel
                      cost={{
                        currency: service.currency,
                        amount: service.setup_amount,
                      }}
                    />
                  ),
                }}
              />
            </>
          )}
        </div>

        {service.regions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
              <FormattedMessage defaultMessage="Exit regions" />
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cyber-text-bright">
              {service.regions.map((r) => (
                <RegionName
                  key={r.region_id}
                  region={{ name: r.name, country_code: r.country_code }}
                />
              ))}
            </div>
            <span className="text-xs text-cyber-muted">
              {/* Worth saying up front: nothing is chosen at purchase. */}
              <FormattedMessage defaultMessage="Every device can use every region. Switching exit is a different config file, not a different plan." />
            </span>
          </div>
        )}

        {action}
      </CardBody>
    </Card>
  );
}
