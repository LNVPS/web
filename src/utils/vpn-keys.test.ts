import { describe, expect, test } from "bun:test";
import {
  forgetPrivateKey,
  recallPrivateKey,
  rememberPrivateKey,
} from "./vpn-keys";

/** A minimal in-memory Storage, standing in for the tab's sessionStorage. */
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

describe("vpn key store", () => {
  test("a key survives until it is forgotten", () => {
    const s = fakeStorage();
    rememberPrivateKey("pub-a", "priv-a", s);
    rememberPrivateKey("pub-b", "priv-b", s);
    expect(recallPrivateKey("pub-a", s)).toBe("priv-a");

    forgetPrivateKey("pub-a", s);
    expect(recallPrivateKey("pub-a", s)).toBeUndefined();
    // Deleting one device must not take the others' keys with it.
    expect(recallPrivateKey("pub-b", s)).toBe("priv-b");
  });

  test("a device this tab never held has no key", () => {
    expect(recallPrivateKey("pub-unknown", fakeStorage())).toBeUndefined();
  });

  test("forgetting an unknown key is a no-op", () => {
    const s = fakeStorage();
    rememberPrivateKey("pub-a", "priv-a", s);
    forgetPrivateKey("pub-missing", s);
    expect(recallPrivateKey("pub-a", s)).toBe("priv-a");
  });

  test("corrupt storage reads as empty rather than throwing", () => {
    const s = fakeStorage({ "lnvps:vpn-device-keys": "{not json" });
    expect(recallPrivateKey("pub-a", s)).toBeUndefined();
    // And it recovers: the next write replaces the bad entry.
    rememberPrivateKey("pub-a", "priv-a", s);
    expect(recallPrivateKey("pub-a", s)).toBe("priv-a");
  });

  test("storage that refuses to write does not break the caller", () => {
    const s = fakeStorage();
    s.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => rememberPrivateKey("pub-a", "priv-a", s)).not.toThrow();
    expect(recallPrivateKey("pub-a", s)).toBeUndefined();
  });
});
