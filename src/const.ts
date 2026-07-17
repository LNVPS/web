import { NostrPrefix } from "@snort/shared";
import { NostrLink, NostrSystem } from "@snort/system";

export const KiB = 1024;
export const MiB = KiB * 1024;
export const GiB = MiB * 1024;
export const TiB = GiB * 1024;
export const PiB = TiB * 1024;

export const KB = 1000;
export const MB = KB * 1000;
export const GB = KB * 1000;
export const TB = GB * 1000;
export const PB = TB * 1000;

export const ApiUrl: string = import.meta.env.VITE_API_URL ?? "";

/**
 * OAuth/OIDC providers enabled server-side, in the order they should appear on
 * the login page. Configured via `VITE_OAUTH_PROVIDERS` (comma-separated tags
 * matching the server config, e.g. "google,github"). Defaults to Google only.
 */
export const OAuthProviders: Array<string> = (
  import.meta.env.VITE_OAUTH_PROVIDERS ?? "google"
)
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter((s: string) => s.length > 0);

/** Start the OAuth login redirect for the given provider tag. */
export function startOAuthLogin(provider: string) {
  // Tell the API where to send us back to (must be on the server's
  // `allowed_redirects` list). The API appends the token as `#token=<jwt>`, so
  // pass a plain path with no fragment of its own.
  const redirect = `${window.location.origin}/oauth/complete`;
  window.location.href = `${ApiUrl}/api/v1/oauth/${provider}/login?redirect=${encodeURIComponent(
    redirect,
  )}`;
}

export const Relays = [
  "wss://nos.lol/",
  "wss://relay.primal.net/",
  "wss://relay.damus.io/",
  "wss://relay.snort.social/",
];

/** Hex public key of the LNVPS support/sales account. */
export const SupportPubkey =
  "fcd818454002a6c47a980393f0549ac6e629d28d5688114bb60d831b5c1832a7";

export const NostrProfile = new NostrLink(
  NostrPrefix.Profile,
  SupportPubkey,
  undefined,
  undefined,
  Relays,
);

export const ServiceBirth = new Date("2024-06-05T00:00:00Z");

export const System = new NostrSystem({
  automaticOutboxModel: false,
  buildFollowGraph: false,
});
Relays.forEach((r) => System.ConnectToRelay(r, { read: true, write: false }));