import { useContext, useMemo, useSyncExternalStore } from "react";
import { LoginSession, LoginState } from "../login";
import { SnortContext } from "@snort/system-react";
import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";

export default function useLogin() {
  const session = useSyncExternalStore(
    (c) => LoginState.hook(c),
    () => LoginState.snapshot(),
    () => undefined,
  );
  const system = useContext(SnortContext);
  return useMemo(
    () =>
      session
        ? {
            type: session.type,
            publicKey: session.publicKey,
            // Token accounts (OAuth provider / passkey) have no Nostr key, so
            // Nostr-only UI (npub, NIP-17 DMs, NIP-44 tools) must be hidden.
            isNostrless:
              session.type === "oauth" || session.type === "webauthn",
            system,
            currency: session.currency,
            api: session.token
              ? new LNVpsApi(ApiUrl, undefined, undefined, session.token)
              : new LNVpsApi(ApiUrl, LoginState.getSigner()),
            update: (fx: (ses: LoginSession) => void) =>
              LoginState.updateSession(fx),
            logout: () => LoginState.logout(),
          }
        : undefined,
    [session, system],
  );
}
