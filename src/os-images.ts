import { VmOsImage } from "./api";

/** Canonical OS image ordering used everywhere images are listed: most popular
 * first, with the newest release as a tiebreak (so 0-popularity images are
 * ordered newest-first). Missing/invalid release dates sort last. */
export function sortOsImages(images: Array<VmOsImage>): Array<VmOsImage> {
  const releaseTime = (i: VmOsImage) => {
    const t = new Date(i.release_date).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  return [...images].sort(
    (a, b) =>
      (b.popularity ?? 0) - (a.popularity ?? 0) ||
      releaseTime(b) - releaseTime(a),
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
