import type { IntlShape } from "react-intl";
import { GiB, KiB, MiB, TiB } from "../const";

/**
 * The figure `BytesSize` renders, as a plain string.
 *
 * `BytesSize` (`src/components/bytes.tsx:8`) is the only thing that should
 * paint a byte count, and everything that renders JSX keeps using it. This
 * exists for the slots that cannot take an element — `Seo`'s `description`,
 * FAQ answers that are also handed to `faqJsonLd` — so a page can put a size
 * in a `{storage}` placeholder there instead of writing the number into the
 * translatable copy.
 *
 * Binary units labelled decimally, exactly as `BytesSize` has always done it:
 * a 20Gi volume reads "20GB", which is what the app catalog and the compose
 * both call it.
 */
export function formatBytesText(
  intl: IntlShape,
  value: number,
  precision = 0,
): string {
  const fmt = (n: number) =>
    intl.formatNumber(n, { maximumFractionDigits: precision });

  if (value >= TiB) {
    return fmt(value / TiB) + "TB";
  } else if (value >= GiB) {
    return fmt(value / GiB) + "GB";
  } else if (value >= MiB) {
    return fmt(value / MiB) + "MB";
  } else if (value >= KiB) {
    return fmt(value / KiB) + "KB";
  } else {
    return fmt(value) + "B";
  }
}
