import { NostrSystem } from "@snort/system";
import { Relays } from "./const";

/**
 * Create a NostrSystem with persistent relay connections.
 *
 * Pass `write: true` for the browser client (needs to publish events).
 * Pass `write: false` for the SSR server (read-only).
 */
export function createNostrSystem(write: boolean): NostrSystem {
  const system = new NostrSystem({
    automaticOutboxModel: false,
    buildFollowGraph: false,
  });
  Relays.forEach((r) => system.ConnectToRelay(r, { read: true, write }));
  return system;
}