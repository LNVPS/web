import { publicKeyFor } from "./wireguard";

/**
 * Optional browser storage for the private keys of VPN devices.
 *
 * Off unless the customer turns it on, because it is a real trade rather than a
 * convenience with no cost: LNVPS never receives the private half, so a key
 * kept only in the page is gone the moment it closes, and a device whose key is
 * lost has to be removed and registered again. Storing it means a config can be
 * re-downloaded later for another region or another install, at the price of
 * the key sitting on this machine where anyone using the browser profile, or
 * any script that gets to run on this origin, can read it.
 *
 * Keyed by public key rather than device id: registration is idempotent on the
 * key, and the pair belongs to the key, not to the row it produced. Reads are
 * verified by deriving the public half, so a stored key is only ever offered
 * for the device it actually opens.
 */

const KEYS = "lnvps:vpn-device-keys";
const ENABLED = "lnvps:vpn-store-keys";

type KeyMap = Record<string, string>;

/** The store, or `undefined` under SSR or a blocked storage API. */
function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    // Storage access throws outright when cookies are blocked.
    return undefined;
  }
}

function read(storage?: Storage): KeyMap {
  const s = storage ?? defaultStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEYS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as KeyMap) : {};
  } catch {
    // Corrupt entry: no keys, rather than a broken page.
    return {};
  }
}

function write(map: KeyMap, storage?: Storage): void {
  const s = storage ?? defaultStorage();
  if (!s) return;
  try {
    s.setItem(KEYS, JSON.stringify(map));
  } catch {
    // Full or read-only storage: the key stays in memory for this page only.
  }
}

/** Whether the customer has asked this browser to keep their keys. */
export function keyStorageEnabled(storage?: Storage): boolean {
  const s = storage ?? defaultStorage();
  try {
    return s?.getItem(ENABLED) === "1";
  } catch {
    return false;
  }
}

/**
 * Turn storage on or off. Turning it off drops every key already held: leaving
 * them behind would make the switch a lie.
 */
export function setKeyStorageEnabled(
  enabled: boolean,
  storage?: Storage,
): void {
  const s = storage ?? defaultStorage();
  if (!s) return;
  try {
    if (enabled) {
      s.setItem(ENABLED, "1");
    } else {
      s.removeItem(ENABLED);
      s.removeItem(KEYS);
    }
  } catch {
    // Nothing to do: without storage there is nothing to remember either.
  }
}

/** Keep a key, if the customer has opted in. A no-op when they have not. */
export function rememberPrivateKey(
  privateKey: string,
  storage?: Storage,
): void {
  if (!keyStorageEnabled(storage)) return;
  const publicKey = publicKeyFor(privateKey);
  if (!publicKey) return;
  const map = read(storage);
  map[publicKey] = privateKey;
  write(map, storage);
}

/**
 * The stored key for a device, if this browser has one that really opens it.
 *
 * The derivation check is what makes the result safe to drop straight into a
 * config: a stale entry left over from a re-registered device would otherwise
 * produce a tunnel that fails its handshake with no visible reason.
 */
export function recallPrivateKey(
  publicKey: string,
  storage?: Storage,
): string | undefined {
  const stored = read(storage)[publicKey];
  if (!stored) return undefined;
  return publicKeyFor(stored) === publicKey ? stored : undefined;
}

/** Drop one device's key, e.g. once the device has been removed. */
export function forgetPrivateKey(publicKey: string, storage?: Storage): void {
  const map = read(storage);
  if (!(publicKey in map)) return;
  delete map[publicKey];
  write(map, storage);
}
