import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
  WebAuthnError,
} from "@simplewebauthn/browser";
import { LNVpsApi } from "./api";
import { ApiUrl, isOnion } from "./const";
import { LoginState } from "./login";

export { browserSupportsWebAuthn };

/**
 * Whether passkeys (WebAuthn) should be offered. Requires browser support and
 * disables passkeys on Tor `.onion` origins, where WebAuthn is unavailable /
 * unreliable in Tor Browser.
 */
export function passkeysAvailable(): boolean {
  return browserSupportsWebAuthn() && !isOnion();
}

/** True when the user cancelled or dismissed the passkey prompt. */
export function isWebauthnCancellation(e: unknown): boolean {
  if (e instanceof WebAuthnError) return e.code === "ERROR_CEREMONY_ABORTED";
  return (
    e instanceof DOMException &&
    (e.name === "NotAllowedError" || e.name === "AbortError")
  );
}

/**
 * Usernameless passkey login. Runs the WebAuthn assertion and stores the
 * resulting session token. Throws on failure (see {@link isWebauthnCancellation}
 * to detect a user cancel).
 */
export async function passkeyLogin() {
  const api = new LNVpsApi(ApiUrl, undefined);
  const start = await api.webauthnLoginStart();
  const credential = await startAuthentication({
    optionsJSON: start.challenge.publicKey,
  });
  const res = await api.webauthnLoginFinish(start.state, credential);
  LoginState.loginToken(res.token, "webauthn");
}

/**
 * Register a new passkey-backed account. Runs the WebAuthn attestation and
 * stores the resulting session token.
 */
export async function passkeyRegister(name?: string) {
  const api = new LNVpsApi(ApiUrl, undefined);
  const start = await api.webauthnRegisterStart(name);
  const credential = await startRegistration({
    optionsJSON: start.challenge.publicKey,
  });
  const res = await api.webauthnRegisterFinish(start.state, credential, name);
  LoginState.loginToken(res.token, "webauthn");
}

/**
 * Add a passkey to the CURRENT (already logged-in) account. Works for any
 * account type. Returns the created credential.
 */
export async function addPasskey(api: LNVpsApi, name?: string) {
  const start = await api.addPasskeyStart(name);
  const credential = await startRegistration({
    optionsJSON: start.challenge.publicKey,
  });
  return await api.addPasskeyFinish(start.state, credential, name);
}
