import { useContext, useMemo, useSyncExternalStore } from "react";
import { LoginState } from "../login";
import { SnortContext } from "@snort/system-react";
import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";

export default function useLogin() {
  const session = useSyncExternalStore(
    (c) => LoginState.hook(c),
    () => LoginState.snapshot(),
  );
  const system = useContext(SnortContext);
  return useMemo(() => session
    ? {
      type: session.type,
      publicKey: session.publicKey,
      system,
      api: new LNVpsApi(ApiUrl, LoginState.getSigner()),
      logout: () => LoginState.logout()
    }
    : undefined, [session, system]);
}
