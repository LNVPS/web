import { useIntl } from "react-intl";
import { GiB, KiB, MiB, TiB } from "../const";

interface BytesSizeProps {
  value: number;
  precision?: number;
}
export default function BytesSize(props: BytesSizeProps) {
  const { formatNumber } = useIntl();
  const fmt = (n: number) =>
    formatNumber(n, { maximumFractionDigits: props.precision ?? 0 });

  if (props.value >= TiB) {
    return fmt(props.value / TiB) + "TB";
  } else if (props.value >= GiB) {
    return fmt(props.value / GiB) + "GB";
  } else if (props.value >= MiB) {
    return fmt(props.value / MiB) + "MB";
  } else if (props.value >= KiB) {
    return fmt(props.value / KiB) + "KB";
  } else {
    return fmt(props.value) + "B";
  }
}
