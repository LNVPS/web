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

/**
 * Server-side singleton — shared between entry-server.tsx and loaders.ts so
 * both use the same persistent relay connections rather than opening duplicates.
 *
 * This module is never imported on the browser (Vite SSR splits the bundles),
 * so the top-level ConnectToRelay calls only run on the server.
 */
export const serverSystem = createNostrSystem(false);
