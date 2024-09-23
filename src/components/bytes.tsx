import { GiB, KiB, MiB, TiB } from "../const";

interface BytesSizeProps {
  value: number;
  precision?: number;
}
export default function BytesSize(props: BytesSizeProps) {
  if (props.value >= TiB) {
    return (props.value / TiB).toFixed(props.precision ?? 0) + "TB";
  } else if (props.value >= GiB) {
    return (props.value / GiB).toFixed(props.precision ?? 0) + "GB";
  } else if (props.value >= MiB) {
    return (props.value / MiB).toFixed(props.precision ?? 0) + "MB";
  } else if (props.value >= KiB) {
    return (props.value / KiB).toFixed(props.precision ?? 0) + "KB";
  } else {
    return props.value.toFixed(props.precision ?? 0) + "B";
  }
}
