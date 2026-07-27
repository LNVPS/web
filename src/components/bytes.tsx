import { useIntl } from "react-intl";
import { formatBytesText } from "../utils/bytes";

interface BytesSizeProps {
  value: number;
  precision?: number;
}
export default function BytesSize(props: BytesSizeProps) {
  const intl = useIntl();
  return formatBytesText(intl, props.value, props.precision);
}
