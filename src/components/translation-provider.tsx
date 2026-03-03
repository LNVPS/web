import { IntlProvider } from "react-intl";
import { createContext, useContext, useEffect, useState } from "react";
import localesMetadata from "../locales-metadata.json";

const supportedLocales = Object.keys(localesMetadata);
const STORAGE_KEY = "locale";

function resolveLocale(raw: string): string {
  const lang = raw.split("-")[0];
  if (supportedLocales.includes(lang)) return lang;
  return "en";
}

function detectLocale(): string {
  // Prefer an explicit user selection stored in localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && supportedLocales.includes(stored)) return stored;
  // Fall back to browser language
  return resolveLocale(navigator.language || "en");
}

interface LocaleContextValue {
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
  const [locale, setLocaleState] = useState(detectLocale);

  function setLocale(next: string) {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }
  const [messages, setMessages] = useState<Record<string, string>>({});

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
      <IntlProvider locale={locale} messages={messages} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
