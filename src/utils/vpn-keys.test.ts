import { describe, expect, test } from "bun:test";
import {
  forgetPrivateKey,
  keyStorageEnabled,
  recallPrivateKey,
  rememberPrivateKey,
  setKeyStorageEnabled,
} from "./vpn-keys";
import { generateWireGuardKeypair } from "./wireguard";

/** A minimal in-memory Storage, standing in for the browser's localStorage. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe("vpn key storage opt-in", () => {
  test("keys are not kept until the customer asks for it", () => {
    const s = fakeStorage();
    const kp = generateWireGuardKeypair();

    expect(keyStorageEnabled(s)).toBe(false);
    rememberPrivateKey(kp.privateKey, s);
    expect(recallPrivateKey(kp.publicKey, s)).toBeUndefined();

    setKeyStorageEnabled(true, s);
    rememberPrivateKey(kp.privateKey, s);
    expect(recallPrivateKey(kp.publicKey, s)).toBe(kp.privateKey);
  });

  test("turning storage off takes the stored keys with it", () => {
    const s = fakeStorage();
    const kp = generateWireGuardKeypair();
    setKeyStorageEnabled(true, s);
    rememberPrivateKey(kp.privateKey, s);

    setKeyStorageEnabled(false, s);
    // Leaving the keys behind would make the switch a lie.
    expect(keyStorageEnabled(s)).toBe(false);
    expect(recallPrivateKey(kp.publicKey, s)).toBeUndefined();
  });
});

describe("recallPrivateKey", () => {
  test("only returns a key that really opens that device", () => {
    const s = fakeStorage();
    const mine = generateWireGuardKeypair();
    const other = generateWireGuardKeypair();
    setKeyStorageEnabled(true, s);
    rememberPrivateKey(mine.privateKey, s);

    expect(recallPrivateKey(mine.publicKey, s)).toBe(mine.privateKey);
    expect(recallPrivateKey(other.publicKey, s)).toBeUndefined();
  });

  test("a stale entry under the right name is still rejected", () => {
    // A device re-registered with a fresh pair can leave the old key filed
    // under the new public key; handing it out builds a tunnel that fails its
    // handshake with nothing on screen to explain why.
    const mine = generateWireGuardKeypair();
    const stale = generateWireGuardKeypair();
    const s = fakeStorage({
      "lnvps:vpn-store-keys": "1",
      "lnvps:vpn-device-keys": JSON.stringify({
        [mine.publicKey]: stale.privateKey,
      }),
    });

    expect(recallPrivateKey(mine.publicKey, s)).toBeUndefined();
  });

  test("a device this browser never held has no key", () => {
    const s = fakeStorage();
    setKeyStorageEnabled(true, s);
    expect(recallPrivateKey("pub-unknown", s)).toBeUndefined();
  });
});

describe("forgetPrivateKey", () => {
  test("drops one device without touching the others", () => {
    const s = fakeStorage();
    const a = generateWireGuardKeypair();
    const b = generateWireGuardKeypair();
    setKeyStorageEnabled(true, s);
    rememberPrivateKey(a.privateKey, s);
    rememberPrivateKey(b.privateKey, s);

    forgetPrivateKey(a.publicKey, s);
    expect(recallPrivateKey(a.publicKey, s)).toBeUndefined();
    expect(recallPrivateKey(b.publicKey, s)).toBe(b.privateKey);
  });

  test("forgetting an unknown key is a no-op", () => {
    const s = fakeStorage();
    const a = generateWireGuardKeypair();
    setKeyStorageEnabled(true, s);
    rememberPrivateKey(a.privateKey, s);

    forgetPrivateKey("pub-missing", s);
    expect(recallPrivateKey(a.publicKey, s)).toBe(a.privateKey);
  });
});

describe("hostile storage", () => {
  test("corrupt entries read as empty and recover on the next write", () => {
    const s = fakeStorage({
      "lnvps:vpn-store-keys": "1",
      "lnvps:vpn-device-keys": "{not json",
    });
    const kp = generateWireGuardKeypair();

    expect(recallPrivateKey(kp.publicKey, s)).toBeUndefined();
    rememberPrivateKey(kp.privateKey, s);
    expect(recallPrivateKey(kp.publicKey, s)).toBe(kp.privateKey);
  });

  test("storage that refuses to write does not break the caller", () => {
    const s = fakeStorage({ "lnvps:vpn-store-keys": "1" });
    s.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const kp = generateWireGuardKeypair();

    expect(() => rememberPrivateKey(kp.privateKey, s)).not.toThrow();
    expect(recallPrivateKey(kp.publicKey, s)).toBeUndefined();
  });

  test("junk in place of a key is never handed back", () => {
    const s = fakeStorage({
      "lnvps:vpn-store-keys": "1",
      "lnvps:vpn-device-keys": JSON.stringify({ "pub-a": "not-a-key" }),
    });
    expect(recallPrivateKey("pub-a", s)).toBeUndefined();
  });
});
