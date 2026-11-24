import { FormattedMessage } from "react-intl";
import { AsyncButton } from "./button";
import type { EmailGate } from "../utils/email-gate";

export function OrderButton({
  ready,
  gate,
  onClick,
}: {
  ready: boolean;
  gate: EmailGate;
  onClick?: () => Promise<void> | void;
}) {
  return (
    <AsyncButton
      className="sm:w-56"
      disabled={!ready || gate !== "ok"}
      onClick={onClick}
    >
      <FormattedMessage defaultMessage="Create Order" />
    </AsyncButton>
  );
}

export function EmailGateNotice({ gate }: { gate: EmailGate }) {
  if (gate !== "required") return null;
  return (
    <p className="m-0 text-xs text-cyber-warning">
      <FormattedMessage defaultMessage="Verify your email to order. We email you before your VM expires so you can renew." />
    </p>
  );
}
