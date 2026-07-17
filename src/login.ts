import { ExternalStore } from "@snort/shared";
import {
  EventPublisher,
  Nip46Signer,
  Nip7Signer,
  PrivateKeySigner,
} from "@snort/system";

export interface LoginSession {
  type: "nip7" | "nsec" | "nip46" | "oauth" | "webauthn";
  /**
   * Nostr pubkey (hex). Empty for token accounts (OAuth / passkey), which have
   * no Nostr key.
   */
  publicKey: string;
  privateKey?: string;
  bunker?: string;
  /** Session JWT (only set for token accounts: `oauth` / `webauthn`). */
  token?: string;
  currency: string;
}
class LoginStore extends ExternalStore<LoginSession | undefined> {
  #session?: LoginSession;
  #signer?: EventPublisher;

  constructor() {
    super();
    const s = localStorage.getItem("session");
    if (s) {
      this.#session = JSON.parse(s);
      // patch session
      if (this.#session) {
        this.#session.type ??= "nip7";
      }
    }
  }

  takeSnapshot() {
    return this.#session ? { ...this.#session } : undefined;
  }

  logout() {
    this.#session = undefined;
    this.#signer = undefined;
    this.#save();
  }

  login(pubkey: string, type: LoginSession["type"] = "nip7") {
    this.#session = {
      type: type ?? "nip7",
      publicKey: pubkey,
      currency: "EUR",
    };
    this.#save();
  }

  loginPrivateKey(key: string) {
    const s = new PrivateKeySigner(key);
    this.#session = {
      type: "nsec",
      publicKey: s.getPubKey(),
      privateKey: key,
      currency: "EUR",
    };
    this.#save();
  }

  loginBunker(url: string, localKey: string, remotePubkey: string) {
    this.#session = {
      type: "nip46",
      publicKey: remotePubkey,
      privateKey: localKey,
      bunker: url,
      currency: "EUR",
    };
    this.#save();
  }

  /**
   * Log in with a Bearer session token from a token account (OAuth provider
   * redirect or a passkey/WebAuthn ceremony).
   */
  loginToken(token: string, type: "oauth" | "webauthn" = "oauth") {
    this.#session = {
      type,
      publicKey: "",
      token,
      currency: "EUR",
    };
    this.#save();
  }

  /** True when the active session is a token (non-Nostr) account. */
  isNostrless() {
    return (
      this.#session?.type === "oauth" || this.#session?.type === "webauthn"
    );
  }

  getSigner() {
    if (this.isNostrless()) {
      throw "Token accounts (OAuth / passkey) have no Nostr signer";
    }
    if (!this.#signer && this.#session) {
      switch (this.#session.type) {
        case "nsec":
          this.#signer = new EventPublisher(
            new PrivateKeySigner(this.#session.privateKey!),
            this.#session.publicKey,
          );
          break;
        case "nip46":
          this.#signer = new EventPublisher(
            new Nip46Signer(
              this.#session.bunker!,
              new PrivateKeySigner(this.#session.privateKey!),
            ),
            this.#session.publicKey,
          );
          break;
        case "nip7":
          this.#signer = new EventPublisher(
            new Nip7Signer(),
            this.#session.publicKey,
          );
          break;
      }
    }

    if (this.#signer) {
      return this.#signer;
    }
    throw "Signer not setup!";
  }

  updateSession(fx: (s: LoginSession) => void) {
    if (this.#session) {
      fx(this.#session);
      this.#save();
    }
  }

  #save() {
    if (this.#session) {
      localStorage.setItem("session", JSON.stringify(this.#session));
    } else {
      localStorage.removeItem("session");
    }
    this.notifyChange();
  }
}

export const LoginState = new LoginStore();
