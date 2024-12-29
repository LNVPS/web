import { useContext, useSyncExternalStore } from "react";
import { LoginState } from "../login";
import { SnortContext } from "@snort/system-react";

export default function useLogin() {
  const session = useSyncExternalStore(
    (c) => LoginState.hook(c),
    () => LoginState.snapshot(),
  );
  const system = useContext(SnortContext);
  return session
    ? {
        type: session.type,
        publicKey: session.publicKey,
        builder: LoginState.getSigner(),
        system,
      }
    : undefined;
}
