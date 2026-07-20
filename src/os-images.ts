import { VmOsImage } from "./api";

/** Canonical OS image ordering used everywhere images are listed: most popular
 * first, with the newest release as a tiebreak. */
export function sortOsImages(images: Array<VmOsImage>): Array<VmOsImage> {
  return [...images].sort(
    (a, b) =>
      (b.popularity ?? 0) - (a.popularity ?? 0) ||
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime(),
  );
}

/** True when an image was released within the last 3 months. */
export function isNewImage(image: VmOsImage): boolean {
  return (
    !!image.release_date &&
    new Date(image.release_date).getTime() >=
      Date.now() - 90 * 24 * 60 * 60 * 1000
  );
}
