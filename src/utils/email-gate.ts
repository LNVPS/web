import type { AccountDetail } from "../api";

export type EmailGate = "loading" | "required" | "ok";

export function emailOrderGate(
  account: AccountDetail | null | undefined,
  mailEnabled: boolean | undefined,
): EmailGate {
  if (account === null) return "ok";
  if (account === undefined || mailEnabled === undefined) return "loading";
  if (!mailEnabled) return "ok";
  return account.email_verified === true ? "ok" : "required";
}

export async function requestEmailVerification(
  api: { updateAccount: (a: AccountDetail) => Promise<unknown> },
  account: AccountDetail,
  email: string,
) {
  await api.updateAccount({ ...account, email });
}
