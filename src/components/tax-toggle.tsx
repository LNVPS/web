import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import classNames from "classnames";
import useLogin from "../hooks/login";
import { taxRateFor, useTaxRates } from "../hooks/tax";

/**
 * Header switch to show prices grossed-up with the account's VAT rate. Only
 * rendered when a rate is actually known (logged in with resolvable billing),
 * so we never offer a grossed price we can't compute. The rate is shown inline.
 */
export default function TaxToggle() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const rates = useTaxRates();
  const rate = taxRateFor(rates);
  if (!login || rate === undefined) return null;

  const on = login.incTax ?? false;
  const ratePct = (
    <FormattedNumber value={rate / 100} style="percent" maximumFractionDigits={2} />
  );

  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => login.update((s) => (s.incTax = !on))}
      title={formatMessage({
        defaultMessage: "Toggle prices inclusive of tax",
      })}
      className={classNames(
        "flex items-center gap-2 py-2 px-2.5 rounded-sm border border-cyber-border transition-colors hover:border-cyber-border-bright",
        on ? "text-cyber-text" : "text-cyber-muted",
      )}
    >
      <span className="text-xs uppercase tracking-wider tabular-nums">
        <FormattedMessage
          defaultMessage="incl. {rate} tax"
          values={{ rate: ratePct }}
        />
      </span>
      <span
        className={classNames(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-cyber-primary/70" : "bg-cyber-border",
        )}
        aria-hidden
      >
        <span
          className={classNames(
            "inline-block h-3 w-3 transform rounded-full transition-transform",
            on ? "translate-x-3.5 bg-cyber-darker" : "translate-x-0.5 bg-cyber-muted",
          )}
        />
      </span>
    </button>
  );
}
