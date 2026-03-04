import { useState } from "react";
import { AsyncButton } from "./button";
import type { AsyncButtonProps } from "./button";
import { FormattedMessage, useIntl } from "react-intl";

type CopyButtonProps = Omit<AsyncButtonProps, "onClick" | "children"> & {
  text: string;
  label?: string;
};

export function CopyButton({ text, label, ...props }: CopyButtonProps) {
  const { formatMessage } = useIntl();
  const [copied, setCopied] = useState(false);
  const defaultLabel = formatMessage({ defaultMessage: "Copy" });

  return (
    <AsyncButton
      {...props}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <FormattedMessage defaultMessage="Copied!" />
      ) : (
        (label ?? defaultLabel)
      )}
    </AsyncButton>
  );
}
