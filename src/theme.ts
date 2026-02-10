import { ExternalStore } from "@snort/shared";

export type Theme = "dark" | "light";

class ThemeStore extends ExternalStore<Theme> {
  #theme: Theme;

  constructor() {
    super();
    const saved = window.localStorage.getItem("theme") as Theme | null;
    this.#theme = saved === "light" ? "light" : "dark";
    this.#apply();
  }

  takeSnapshot(): Theme {
    return this.#theme;
  }

  toggle() {
    this.#theme = this.#theme === "dark" ? "light" : "dark";
    this.#apply();
    window.localStorage.setItem("theme", this.#theme);
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
