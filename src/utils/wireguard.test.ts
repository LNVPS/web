import { describe, expect, test } from "bun:test";
import { base64 } from "@scure/base";
import {
  PRIVATE_KEY_PLACEHOLDER,
  applyPrivateKey,
  configFileName,
  generateWireGuardKeypair,
  publicKeyFor,
} from "./wireguard";

describe("generateWireGuardKeypair", () => {
  test("produces the 32-byte base64 keys wg writes", () => {
    const { privateKey, publicKey } = generateWireGuardKeypair();
    expect(base64.decode(privateKey)).toHaveLength(32);
    expect(base64.decode(publicKey)).toHaveLength(32);
    // wg's own format: 44 base64 characters ending in '='.
    expect(privateKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(publicKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  test("a new pair every call", () => {
    const a = generateWireGuardKeypair();
    const b = generateWireGuardKeypair();
    expect(a.privateKey).not.toBe(b.privateKey);
    expect(a.publicKey).not.toBe(b.publicKey);
  });
});

describe("publicKeyFor", () => {
  test("derives the public half of a generated pair", () => {
    const { privateKey, publicKey } = generateWireGuardKeypair();
    expect(publicKeyFor(privateKey)).toBe(publicKey);
  });

  test("a key for another device derives to a different public key", () => {
    const a = generateWireGuardKeypair();
    const b = generateWireGuardKeypair();
    expect(publicKeyFor(a.privateKey)).not.toBe(b.publicKey);
  });

  test("nothing usable comes back from junk", () => {
    expect(publicKeyFor("")).toBeUndefined();
    expect(publicKeyFor("not base64 at all!")).toBeUndefined();
    // Right alphabet, wrong length: a truncated key must not derive something.
    expect(publicKeyFor("AAAA")).toBeUndefined();
  });
});

describe("applyPrivateKey", () => {
  const config = `[Interface]\nPrivateKey = ${PRIVATE_KEY_PLACEHOLDER}\nAddress = 10.0.0.2/32\n`;

  test("fills the placeholder the API left", () => {
    expect(applyPrivateKey(config, "SECRET")).toContain("PrivateKey = SECRET");
    expect(applyPrivateKey(config, "SECRET")).not.toContain(
      PRIVATE_KEY_PLACEHOLDER,
    );
  });

  test("leaves the config alone when the key was not kept", () => {
    // A device registered in an earlier session: still worth showing, and the
    // placeholder is the honest thing to show.
    expect(applyPrivateKey(config)).toBe(config);
    expect(applyPrivateKey(config, "")).toBe(config);
  });
});

describe("configFileName", () => {
  test("the basename is a usable wg-quick interface name", () => {
    expect(configFileName("Laptop", "Dublin")).toBe("laptop-dublin.conf");
    expect(configFileName("My Phone!", "Quebec")).toBe("my-phone-quebec.conf");
  });

  test("never exceeds the 15-character interface limit", () => {
    const name = configFileName("a-very-long-device-name", "some-region");
    expect(name.replace(/\.conf$/, "").length).toBeLessThanOrEqual(15);
  });

  test("an interface name must start with a letter", () => {
    expect(configFileName("2nd laptop", "Dublin")).toMatch(/^[a-z]/);
    expect(configFileName("!!!", "!!!")).toMatch(/^[a-z]/);
  });

  test("does not end in the hyphen a truncation left behind", () => {
    // The cut lands exactly on the separator: "abcdefghijklmn-".
    expect(configFileName("abcdefghijklmn", "Dublin")).toBe(
      "abcdefghijklmn.conf",
    );
  });
});
