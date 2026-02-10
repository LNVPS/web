import { useSyncExternalStore } from "react";
import { Theme, ThemeState } from "../theme";

export default function useTheme(): {
  theme: Theme;
  toggle: () => void;
} {
  const theme = useSyncExternalStore(
    (c) => ThemeState.hook(c),
    () => ThemeState.snapshot(),
  );
  return {
    theme,
    toggle: () => ThemeState.toggle(),
  };
}
