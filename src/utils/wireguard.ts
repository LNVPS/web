import { x25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";

/**
 * The placeholder the API leaves in a rendered `wg-quick` file.
 *
 * LNVPS never receives the private half of a device's keypair, so the config it
 * renders cannot contain one. Must match `PRIVATE_KEY_PLACEHOLDER` in the API.
 */
export const PRIVATE_KEY_PLACEHOLDER = "<your private key>";

export interface WireGuardKeypair {
  /** Base64, as `wg genkey` writes it. Never sent to LNVPS. */
  privateKey: string;
  /** Base64, as `wg pubkey` writes it. This is what registers the device. */
  publicKey: string;
}

/**
 * Generate a WireGuard keypair in the browser.
 *
 * WireGuard keys are Curve25519, which is what `wg genkey`/`wg pubkey` produce
 * and what the route server expects, base64 over the raw 32 bytes. Generating
 * here rather than server-side is the whole security argument for the product:
 * the private key never exists anywhere LNVPS can see it, so a compromise of
 * the platform cannot decrypt a customer's traffic.
 */
export function generateWireGuardKeypair(): WireGuardKeypair {
  const { secretKey, publicKey } = x25519.keygen();
  return {
    privateKey: base64.encode(secretKey),
    publicKey: base64.encode(publicKey),
  };
}

/**
 * The public key a private key belongs to, or `undefined` when the input is not
 * a WireGuard key at all.
 *
 * Used to check a stored key against the device it claims to be for: the server
 * only ever knows public keys, so this is the one way to tell whether a key
 * kept in the browser still opens a given tunnel. Pasting the wrong one into a
 * config produces a tunnel that hands shake with nothing and says why nowhere.
 */
export function publicKeyFor(privateKey: string): string | undefined {
  try {
    const secret = base64.decode(privateKey.trim());
    if (secret.length !== 32) return undefined;
    return base64.encode(x25519.getPublicKey(secret));
  } catch {
    return undefined;
  }
}

/**
 * Put the private key the client kept into the config the API rendered.
 *
 * Returns the config untouched when there is no key to insert, so a config can
 * still be shown (and its peer settings read) for a device whose key was
 * generated in an earlier session and not kept.
 */
export function applyPrivateKey(config: string, privateKey?: string): string {
  if (!privateKey) return config;
  return config.replaceAll(PRIVATE_KEY_PLACEHOLDER, privateKey);
}

/**
 * `wg-quick` interface name rules, applied to the download filename: the file's
 * basename becomes the interface name, which must be at most 15 characters of
 * letters, digits, underscore, hyphen or period, starting with a letter.
 */
export function configFileName(deviceName: string, regionName: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const base = [slug(deviceName), slug(regionName)].filter(Boolean).join("-");
  // A name that slugged away to nothing, or one starting with a digit, would
  // not be a usable interface name.
  const safe = /^[a-z]/.test(base) ? base : `lnvps-${base}`;
  return `${safe.slice(0, 15).replace(/-+$/, "")}.conf`;
}
