import { useLocale } from "./translation-provider";

export default function LanguageSwitcher() {
  const { locale, setLocale, supportedLocales } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="p-2 rounded-sm border border-cyber-border hover:border-cyber-border-bright hover:shadow-neon-sm transition-all text-cyber-text hover:text-cyber-primary bg-transparent text-sm cursor-pointer"
      title="Select language"
    >
      {Object.entries(supportedLocales).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}
