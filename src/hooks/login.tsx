import { useContext, useSyncExternalStore } from "react";
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
  const signer = LoginState.getSigner();
  return session
    ? {
        type: session.type,
        publicKey: session.publicKey,
        system,
        api: new LNVpsApi(ApiUrl, signer),
      }
    : undefined;
}
