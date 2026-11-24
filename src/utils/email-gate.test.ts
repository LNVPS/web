import { describe, expect, test } from "bun:test";
import type { AccountDetail } from "../api";
import { emailOrderGate, requestEmailVerification } from "./email-gate";

const account = (extra: Partial<AccountDetail>): AccountDetail => ({
  contact_nip17: false,
  contact_email: false,
  contact_telegram: false,
  contact_whatsapp: false,
  ...extra,
});

describe("emailOrderGate", () => {
  test("blocks an unverified email while mail is on", () => {
    expect(
      emailOrderGate(account({ email: "a@b.c", email_verified: false }), true),
    ).toBe("required");
  });

  test("allows a verified email", () => {
    expect(
      emailOrderGate(account({ email: "a@b.c", email_verified: true }), true),
    ).toBe("ok");
  });

  test("allows an account with no email when mail is off", () => {
    expect(emailOrderGate(account({}), false)).toBe("ok");
  });

  test("allows an unverified email when mail is off", () => {
    expect(
      emailOrderGate(account({ email: "a@b.c", email_verified: false }), false),
    ).toBe("ok");
  });

  test("blocks an account with no email while mail is on", () => {
    expect(emailOrderGate(account({}), true)).toBe("required");
  });

  test("waits while the account or the mail setting is loading", () => {
    expect(emailOrderGate(undefined, true)).toBe("loading");
    expect(emailOrderGate(account({}), undefined)).toBe("loading");
  });

  test("does not lock out when the account could not be loaded", () => {
    expect(emailOrderGate(null, true)).toBe("ok");
  });
});

describe("requestEmailVerification", () => {
  test("patches the account with the email so the server sends the mail", async () => {
    const calls: Array<AccountDetail> = [];
    const api = {
      updateAccount: async (a: AccountDetail) => {
        calls.push(a);
      },
    };
    await requestEmailVerification(
      api,
      account({ contact_email: true }),
      "a@b.c",
    );
    expect(calls).toEqual([account({ contact_email: true, email: "a@b.c" })]);
  });
});
