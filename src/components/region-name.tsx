import classNames from "classnames";
import { countryFlag } from "../utils/country";

/**
 * The flag of a region's country, drawn as an SVG by `flag-icons` so it looks
 * the same on every platform (emoji flags do not render at all on Windows).
 *
 * Renders nothing when the region has no usable country code (see
 * {@link countryFlag}).
 */
export function CountryFlag({
  countryCode,
  className,
}: {
  countryCode?: string | null;
  className?: string;
}) {
  const flag = countryFlag(countryCode);
  if (!flag) return null;

  return (
    <span
      // The 4x3 rectangle, not the square `fis` variant: at label size a
      // square flag is hard to tell apart from an icon.
      className={classNames(flag.className, "shrink-0 rounded-xs", className)}
      // flag-icons sizes `.fi` off line-height, which leaves the flag smaller
      // than the cap height of the label beside it and reading as a stray
      // speck. Sized here to sit a little above the text height, at the 4:3
      // ratio of the artwork. Inline style because the library's own rule is
      // loaded after Tailwind and would otherwise win on source order.
      style={{ width: "1.6em", height: "1.2em", verticalAlign: "-0.25em" }}
      role="img"
      aria-label={flag.label}
      title={flag.label}
    />
  );
}

/**
 * A region's name preceded by its country flag: the one place region labels
 * are built, so every surface picks up a newly tagged country at once.
 */
export default function RegionName({
  region,
  className,
}: {
  region?: { name: string; country_code?: string | null } | null;
  className?: string;
}) {
  if (!region) return null;

  return (
    <span className={classNames("inline-flex items-center gap-1.5", className)}>
      <CountryFlag countryCode={region.country_code} />
      {region.name}
    </span>
  );
}
