import { ExternalStore } from "@snort/shared";
import {
  EventSigner,
  Nip7Signer,
  SystemInterface,
  UserState,
} from "@snort/system";

class LoginShell extends ExternalStore<UserState<void> | undefined> {
  #state?: UserState<void>;

  async login(signer: EventSigner, system: SystemInterface) {
    if (this.#state !== undefined) {
      throw new Error("Already logged in");
    }
    const pubkey = await signer.getPubKey();
    this.#state = new UserState<void>(pubkey);
    await this.#state.init(signer, system);
    this.#state.on("change", () => this.notifyChange());
    this.notifyChange();
  }

  takeSnapshot() {
    return this.#state;
  }
}

export const Login = new LoginShell();

export async function loginNip7(system: SystemInterface) {
  const signer = new Nip7Signer();
  const pubkey = await signer.getPubKey();
  if (pubkey) {
    await Login.login(signer, system);
  } else {
    throw new Error("No nostr extension found");
  }
}
