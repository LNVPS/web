import { useState } from "react";
import { AsyncButton } from "./button";
import type { AsyncButtonProps } from "./button";

type CopyButtonProps = Omit<AsyncButtonProps, "onClick" | "children"> & {
  text: string;
  label?: string;
};

export function CopyButton({
  text,
  label = "Copy",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <AsyncButton
      {...props}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied!" : label}
    </AsyncButton>
  );
}
