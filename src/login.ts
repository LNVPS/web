import { Nip7Signer, SystemInterface, UserState } from "@snort/system";

export let Login: UserState<void> | undefined;

export async function loginNip7(system: SystemInterface) {
  const signer = new Nip7Signer();
  const pubkey = await signer.getPubKey();
  if (pubkey) {
    Login = new UserState<void>(pubkey);
    await Login.init(signer, system);
  } else {
    throw new Error("No nostr extension found");
  }
}
