import { useSyncExternalStore } from "react";
import { Theme, ThemeState } from "../theme";

const serverTheme: Theme = "dark";

export default function useTheme(): {
  theme: Theme;
  toggle: () => void;
} {
  const theme = useSyncExternalStore(
    (c) => ThemeState.hook(c),
    () => ThemeState.snapshot(),
    () => serverTheme,
  );
  return {
    theme,
    toggle: () => ThemeState.toggle(),
  };
}
