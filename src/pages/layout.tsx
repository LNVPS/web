import { Link, Outlet } from "react-router-dom";
import { useEffect } from "react";
import LoginButton from "../components/login-button";
import ThemeToggle from "../components/theme-toggle";
import TaxToggle from "../components/tax-toggle";
import LanguageSwitcher from "../components/language-switcher";
import { saveRefCode } from "../ref";
import Toaster from "../components/toaster";

export default function Layout() {
  useEffect(() => {
    saveRefCode();
  }, []);
  return (
    <div className="max-w-6xl mx-auto m-2 p-2">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border">
        {/*
          Two lockups rather than one recoloured file: the bundle ships the LN
          glyph as cyan `#2fa9e3` on dark and deep cyan `#147fc0` on light, and
          that pairing is a brand rule in the bundle's README, not a tint. Dark
          is the default theme — `index.html` only ever adds `.light` — so the
          dark lockup is the one that renders unless the class is present.
        */}
        <Link
          to="/"
          className="animate-flicker transition-all hover:drop-shadow-[0_0_10px_#2fa9e3]"
        >
          <img
            src="/lockup-dark.svg"
            alt="LNVPS"
            className="h-7 w-auto light:hidden"
          />
          <img
            src="/lockup-light.svg"
            alt="LNVPS"
            className="hidden h-7 w-auto light:block"
          />
        </Link>
        <div className="flex items-center gap-3">
          <TaxToggle />
          <LanguageSwitcher />
          <ThemeToggle />
          <LoginButton />
        </div>
      </div>

      <Outlet />
      <Toaster />
    </div>
  );
}
