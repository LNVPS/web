import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";
import type { AccountCredit } from "../api";
import useLogin from "../hooks/login";
import useExchangeRates from "../hooks/useExchangeRates";
import { useCreditReadiness } from "../hooks/account-credit";
import { showError } from "../toast";
import { runwayHours, type Money } from "../utils/hourly";
import { AsyncButton } from "./button";
import { CostAmount } from "./cost";

/**
 * Hourly billing is paid from account credit and never invoiced, so wherever
 * an hourly machine is ordered, renewed or resized the customer needs to see
 * three things the other intervals never ask about: that credit is switched on
 * for spending, that the balance covers this charge, and how long it keeps the
 * machine running. This panel says each in turn and offers the fix for
 * whichever is missing.
 */
export default function HourlyCreditPanel({
  credit,
  needed,
  perHour,
  onChange,
  className,
}: {
  credit: AccountCredit | undefined;
  /** What the next charge costs, tax included, when known. */
  needed?: Money;
  /** One hour's price, to show how long the balance lasts. */
  perHour?: Money;
  /** Called with the refreshed credit after auto-apply is switched on. */
  onChange?: (credit: AccountCredit) => void;
  className?: string;
}) {
  const login = useLogin();
  const { data: rates } = useExchangeRates();
  const ready = useCreditReadiness(credit, needed);

  if (!credit || !ready) {
    return (
      <Shell className={className}>
        <span className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Checking your account credit…" />
        </span>
      </Shell>
    );
  }

  const hours = perHour ? runwayHours(credit, perHour, rates) : undefined;
  const tone = ready.ready ? "ok" : "warn";

  let message: ReactNode;
  let action: ReactNode;
  if (!ready.optedIn) {
    message = (
      <FormattedMessage defaultMessage="Hourly billing is paid from your account credit, never invoiced. Turn on automatic credit so each hour is taken from your balance." />
    );
    action = (
      <AsyncButton
        onClick={async () => {
          if (!login?.api) return;
          try {
            onChange?.(await login.api.setCreditAutoApply(true));
          } catch (e) {
            showError(e);
          }
        }}
      >
        <FormattedMessage defaultMessage="Apply credit automatically" />
      </AsyncButton>
    );
  } else if (!ready.funded || ready.covers === false) {
    message = needed ? (
      <FormattedMessage
        defaultMessage="Your balance doesn't cover {amount}. Top up your credit to continue."
        values={{
          amount: <CostAmount cost={needed} converted={false} />,
        }}
      />
    ) : (
      <FormattedMessage defaultMessage="Your balance is empty. Top up your credit to continue." />
    );
    action = (
      <Link
        to="/account/credit"
        className="inline-block rounded-sm border border-cyber-primary px-4 py-2 text-center text-sm uppercase text-cyber-primary transition-colors hover:bg-cyber-primary/10"
      >
        <FormattedMessage defaultMessage="Top up credit" />
      </Link>
    );
  } else {
    message =
      hours !== undefined ? (
        <FormattedMessage
          defaultMessage="Your balance keeps this running for about {hours, plural, one {# hour} other {# hours}}. The machine stops when it runs out, so keep it topped up."
          values={{ hours }}
        />
      ) : (
        <FormattedMessage defaultMessage="Your balance covers this. The machine stops when it runs out, so keep it topped up." />
      );
  }

  return (
    <Shell className={className} tone={tone}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
          <FormattedMessage defaultMessage="Account credit" />
        </span>
        <span className="text-lg text-cyber-text-bright">
          <CostAmount
            cost={{ currency: credit.currency, amount: credit.balance }}
            converted={false}
          />
        </span>
      </div>
      <div className="text-xs leading-relaxed text-cyber-text">{message}</div>
      {action && <div className="flex">{action}</div>}
    </Shell>
  );
}

function Shell({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone?: "ok" | "warn";
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "flex flex-col gap-3 rounded-sm border px-4 py-3",
        tone === "warn"
          ? "border-cyber-warning/50 bg-cyber-warning/10"
          : tone === "ok"
            ? "border-cyber-primary/40 bg-cyber-primary/10"
            : "border-cyber-border bg-cyber-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}
