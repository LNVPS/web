import { describe, expect, test } from "bun:test";
import { countryFlag } from "./country";

describe("countryFlag", () => {
  test("maps a country code to a flag-icons class and country name", () => {
    expect(countryFlag("IE")).toEqual({
      className: "fi fi-ie",
      label: "Ireland",
    });
  });

  test("accepts the code in any casing or padding the API might send", () => {
    expect(countryFlag("gb")?.className).toBe("fi fi-gb");
    expect(countryFlag(" CA ")?.className).toBe("fi fi-ca");
  });

  test("an untagged region has no flag rather than an empty box", () => {
    expect(countryFlag(undefined)).toBeUndefined();
    expect(countryFlag(null)).toBeUndefined();
    expect(countryFlag("")).toBeUndefined();
    expect(countryFlag("   ")).toBeUndefined();
  });

  test("rejects codes flag-icons has no rule for", () => {
    // Not a country: would render as a hole where the flag should be.
    expect(countryFlag("ZZ")).toBeUndefined();
    // Alpha-3 is what the *user* tax fields use; regions are alpha-2.
    expect(countryFlag("IRL")).toBeUndefined();
  });
});
