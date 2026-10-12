import { describe, expect, test } from "bun:test";
import type { ConfigField } from "lnvps-compose";
import {
  DEPLOYMENT_NAME_RE,
  defaultConfigValues,
  hasMissingRequired,
} from "./deployment-form";

const field = (
  name: string,
  extra: Partial<ConfigField> = {},
): ConfigField => ({ name, type: "string", required: false, ...extra });

describe("hasMissingRequired", () => {
  const fields = [field("owner", { required: true }), field("note")];

  test("flags a blank required field", () => {
    expect(hasMissingRequired(fields, () => "")).toBe(true);
    expect(
      hasMissingRequired(fields, (f) => (f.name === "owner" ? "  " : "x")),
    ).toBe(true);
  });

  test("passes once every required field has a value", () => {
    expect(
      hasMissingRequired(fields, (f) => (f.name === "owner" ? "npub1" : "")),
    ).toBe(false);
    expect(hasMissingRequired([field("note")], () => "")).toBe(false);
  });
});

describe("defaultConfigValues", () => {
  test("uses declared defaults, false for bools and blank otherwise", () => {
    expect(
      defaultConfigValues([
        field("name", { default: "relay" }),
        field("auth", { type: "bool" }),
        field("note"),
      ]),
    ).toEqual({ name: "relay", auth: "false", note: "" });
  });
});

describe("DEPLOYMENT_NAME_RE", () => {
  test("accepts a DNS label and rejects anything else", () => {
    expect(DEPLOYMENT_NAME_RE.test("my-relay")).toBe(true);
    expect(DEPLOYMENT_NAME_RE.test("-bad")).toBe(false);
    expect(DEPLOYMENT_NAME_RE.test("Bad")).toBe(false);
  });
});
