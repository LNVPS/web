import { IntlProvider } from "react-intl";
import { useMemo } from "react";

interface TranslationProviderProps {
  children: React.ReactNode;
}

export default function TranslationProvider({
  children,
}: TranslationProviderProps) {
  const locale = useMemo(() => navigator.language.split("-")[0] || "en", []);
  const messages = useMemo(() => ({}), []);

  return (
    <IntlProvider locale={locale} messages={messages} fallbackLocale="en">
      {children}
    </IntlProvider>
  );
}
