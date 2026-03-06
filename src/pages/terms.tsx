import Markdown from "../components/markdown";
import TOS from "../tos.md?raw";
import Seo from "../components/seo";
import { useIntl } from "react-intl";

export function TosPage() {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-4">
      <Seo
        title={formatMessage({
          defaultMessage: "Terms of Service and Acceptable Use",
        })}
        canonical="/tos"
        description={formatMessage({
          defaultMessage:
            "Terms of Service for LNVPS — Bitcoin Lightning VPS provider. Read our usage policies, acceptable use guidelines, and service terms.",
        })}
      />
      <Markdown content={TOS} />
    </div>
  );
}
