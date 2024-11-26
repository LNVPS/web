import { VmOsImage } from "../api";

export default function OsImageName({ image }: { image: VmOsImage }) {
  return (
    <span>
      {image.distribution} {image.version}
    </span>
  );
}
