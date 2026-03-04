import { IntlProvider } from "react-intl";
import { createContext, useContext, useEffect, useState } from "react";
import localesMetadata from "../locales-metadata.json";

const supportedLocales = Object.keys(localesMetadata);

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

function getDir(locale: string): "rtl" | "ltr" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

const STORAGE_KEY = "locale";

/** Language-only tag (e.g. "en", "ar") — used to select translation messages. */
function langTag(locale: string): string {
  const lang = locale.split("-")[0];
  return supportedLocales.includes(lang) ? lang : "en";
}

/**
 * Returns { lang, full } where:
 *  - lang  — language-only tag used to load translation messages ("en", "ar", …)
 *  - full  — full BCP 47 tag passed to IntlProvider for date/number formatting
 *            ("en-IE", "zh-TW", "ar", …)
 */
function detectLocale(): { lang: string; full: string } {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && supportedLocales.includes(stored)) {
    return { lang: stored, full: stored };
  }
  const full = navigator.language || "en";
  return { lang: langTag(full), full };
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
  const initial = detectLocale();
  const [locale, setLocaleState] = useState(initial.lang);
  // fullLocale preserves the region subtag (e.g. "en-IE") for date/number formatting.
  // When the user explicitly picks a language from the switcher we only have the
  // language tag, so full and lang are the same in that case.
  const [fullLocale, setFullLocale] = useState(initial.full);

  function setLocale(next: string) {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    setFullLocale(next);
  }
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = document.documentElement;
    root.lang = fullLocale;
    root.dir = getDir(locale);
  }, [locale, fullLocale]);

  useEffect(() => {
    if (locale === "en") {
      setMessages({});
      return;
    }
    import(`../locales/${locale}.json`)
      .then((m) => {
        const raw = m.default as Record<
          string,
          string | { defaultMessage: string }
        >;
        // src/locales files are in { key: { defaultMessage: "..." } } format
        // flatten to { key: "..." } for IntlProvider
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          flat[k] = typeof v === "string" ? v : v.defaultMessage;
        }
        setMessages(flat);
      })
      .catch(() => setMessages({}));
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, supportedLocales: localesMetadata }}
    >
      <IntlProvider locale={fullLocale} messages={messages} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
