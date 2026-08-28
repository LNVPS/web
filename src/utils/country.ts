import { default as iso } from "iso-3166-1";

/** A flag ready to render: the `flag-icons` class and its accessible label. */
export interface CountryFlagInfo {
  /** e.g. "fi fi-ie" */
  className: string;
  /** Full country name, used as the img label and tooltip. */
  label: string;
}

/**
 * The flag of an ISO 3166-1 alpha-2 country code, or `undefined` when there is
 * nothing to draw.
 *
 * Regions carry `country_code` as a nullable column, so an untagged region must
 * render as plain text rather than a blank box. Codes that are not real
 * countries are rejected for the same reason: `flag-icons` has no rule for
 * `fi-zz`, and an unknown class would leave a hole where a flag should be.
 */
export function countryFlag(
  countryCode?: string | null,
): CountryFlagInfo | undefined {
  const code = countryCode?.trim().toLowerCase();
  if (!code || code.length !== 2) return undefined;

  const country = iso.whereAlpha2(code);
  if (!country) return undefined;

  return { className: `fi fi-${code}`, label: country.country };
}
