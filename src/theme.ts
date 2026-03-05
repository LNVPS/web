import { ExternalStore } from "@snort/shared";
import { isBrowser } from "./ssr";

export type Theme = "dark" | "light";

class ThemeStore extends ExternalStore<Theme> {
  #theme: Theme;

  constructor() {
    super();
    const saved = isBrowser
      ? (localStorage.getItem("theme") as Theme | null)
      : null;
    this.#theme = saved === "light" ? "light" : "dark";
    if (isBrowser) this.#apply();
  }

  takeSnapshot(): Theme {
    return this.#theme;
  }

  toggle() {
    this.#theme = this.#theme === "dark" ? "light" : "dark";
    this.#apply();
    localStorage.setItem("theme", this.#theme);
    this.notifyChange();
  }

  #apply() {
    if (this.#theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }
}

export const ThemeState = new ThemeStore();
