import { IntlProvider } from "react-intl";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import localesMetadata from "../locales-metadata.json";
import { LOCALE_COOKIE } from "../utils/locale";

declare global {
  interface Window {
    __SSR_LOCALE__?: string;
    __SSR_MESSAGES__?: Record<string, string>;
  }
}

const supportedLocales = Object.keys(localesMetadata);

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

function getDir(locale: string): "rtl" | "ltr" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

/** Write the locale preference as a long-lived cookie readable by the server. */
function setLocaleCookie(locale: string) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Read the locale cookie on the client, returns null if absent. */
function getLocaleCookie(): string | null {
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return null;
  const val = decodeURIComponent(match.slice(LOCALE_COOKIE.length + 1));
  return supportedLocales.includes(val) ? val : null;
}

interface LocaleContextValue {
  /** Language-only tag (e.g. "en", "ar") — matches keys in supportedLocales. */
  locale: string;
  setLocale: (locale: string) => void;
  supportedLocales: Record<string, string>;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  supportedLocales: localesMetadata,
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface TranslationProviderProps {
  children: React.ReactNode;
}

export default function TranslationProvider({
  children,
}: TranslationProviderProps) {
  // The server already read the locale cookie and rendered in the right locale.
  // Use the injected SSR globals as the initial state so the first client render
  // matches exactly, avoiding a hydration mismatch.
  const ssrLocale =
    typeof window !== "undefined" ? window.__SSR_LOCALE__ : undefined;
  const ssrMessages =
    typeof window !== "undefined" ? window.__SSR_MESSAGES__ : undefined;

  const [locale, setLocaleState] = useState(ssrLocale ?? "en");
  const [fullLocale, setFullLocale] = useState(ssrLocale ?? "en");
  const [messages, setMessages] = useState<Record<string, string>>(
    ssrMessages ?? {},
  );

  function setLocale(next: string) {
    setLocaleCookie(next);
    setLocaleState(next);
    setFullLocale(next);
  }

  useEffect(() => {
    const root = document.documentElement;
    root.lang = fullLocale;
    root.dir = getDir(locale);
  }, [locale, fullLocale]);

  // Capture SSR values in refs — they're set once at module load and never
  // change, so they don't need to be in the useEffect dependency array.
  const ssrLocaleRef = useRef(ssrLocale);
  const ssrMessagesRef = useRef(ssrMessages);

  useEffect(() => {
    if (locale === "en") {
      setMessages({});
      return;
    }
    // Skip the dynamic import if SSR already provided matching messages.
    if (ssrMessagesRef.current && ssrLocaleRef.current === locale) return;
    import(`../locales/${locale}.json`)
      .then((m) => {
        const raw = m.default as Record<
          string,
          string | { defaultMessage: string }
        >;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          flat[k] = typeof v === "string" ? v : v.defaultMessage;
        }
        setMessages(flat);
      })
      .catch(() => setMessages({}));
  }, [locale]);

  // On first mount, if the user has no cookie yet but has a browser preference
  // that differs from what the server guessed, correct it without a full reload.
  useEffect(() => {
    const cookieLocale = getLocaleCookie();
    if (!cookieLocale) {
      // No explicit preference — fall back to navigator.language.
      const navLang = navigator.language.split("-")[0].toLowerCase();
      const best = supportedLocales.includes(navLang) ? navLang : "en";
      if (best !== locale) setLocale(best);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, supportedLocales: localesMetadata }}
    >
      <IntlProvider locale={locale} messages={messages} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
