import { useSyncExternalStore } from "react";
import { Login } from "../login";

export default function useLogin() {
  return useSyncExternalStore(
    (c) => {
      Login?.on("change", c);
      return () => Login?.off("change", c);
    },
    () => Login,
  );
}
