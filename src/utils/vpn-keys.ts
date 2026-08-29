/**
 * Where a device's private key lives between the moment it is generated and the
 * moment the customer has saved a config somewhere useful.
 *
 * `sessionStorage`, deliberately: LNVPS never receives the private half, so if
 * the browser forgets it the key is gone for good and the device has to be
 * re-registered. Holding it for the life of the tab means a reload, or coming
 * back to fetch a second region's config, does not cost the customer their
 * device. Closing the tab clears it, which is the trade we want against a key
 * sitting in `localStorage` forever on a shared machine.
 *
 * Keyed by public key rather than device id because registration is idempotent
 * on the key: re-registering the same device returns the same row, and the pair
 * belongs to the key, not to the id it happened to get.
 */

const STORAGE_KEY = "lnvps:vpn-device-keys";

type KeyMap = Record<string, string>;

/** The tab-scoped store, or `undefined` under SSR or a blocked storage API. */
function defaultStorage(): Storage | undefined {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : undefined;
  } catch {
    // Storage access can throw outright when cookies are blocked.
    return undefined;
  }
}

function read(storage?: Storage): KeyMap {
  const s = storage ?? defaultStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as KeyMap) : {};
  } catch {
    // Corrupt entry: treat it as no keys rather than breaking the page.
    return {};
  }
}

function write(map: KeyMap, storage?: Storage): void {
  const s = storage ?? defaultStorage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Full or read-only storage: the key stays in memory for this render only.
  }
}

export function rememberPrivateKey(
  publicKey: string,
  privateKey: string,
  storage?: Storage,
): void {
  const map = read(storage);
  map[publicKey] = privateKey;
  write(map, storage);
}

/** The private key for a device, or `undefined` when this tab never held it. */
export function recallPrivateKey(
  publicKey: string,
  storage?: Storage,
): string | undefined {
  return read(storage)[publicKey];
}

/** Drop a key, e.g. once its device has been deleted. */
export function forgetPrivateKey(publicKey: string, storage?: Storage): void {
  const map = read(storage);
  if (!(publicKey in map)) return;
  delete map[publicKey];
  write(map, storage);
}
