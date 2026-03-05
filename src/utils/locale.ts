import localesMetadata from "../locales-metadata.json";

const supportedLocales = Object.keys(localesMetadata);

export const LOCALE_COOKIE = "locale";

/** Parse a Cookie header string and return the value for a given name. */
function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k.trim() === name) return decodeURIComponent(v ?? "");
  }
  return null;
}

/**
 * Resolve the best locale for a request.
 *
 * Priority:
 *  1. `locale` cookie — explicit user preference, readable server-side
 *  2. Accept-Language header — browser default
 *  3. "en" fallback
 */
export function detectLocale(
  acceptLanguage: string | null,
  cookieHeader?: string | null,
): string {
  const cookie = parseCookie(cookieHeader ?? null, LOCALE_COOKIE);
  if (cookie && supportedLocales.includes(cookie)) return cookie;

  if (!acceptLanguage) return "en";
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, qStr] = part.trim().split(";q=");
      return {
        lang: tag.split("-")[0].toLowerCase(),
        q: qStr ? parseFloat(qStr) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of tags) {
    if (supportedLocales.includes(lang)) return lang;
  }
  return "en";
}
